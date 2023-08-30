import {
    $query, 
    $update,
    Principal, 
    Result,
    Opt,
    match,
    Record,
    Variant,
    nat,
    StableBTreeMap,
    ic,
    Vec
} from 'azle';

import { 
    v4 as uuidv4 
} from 'uuid';

import { Account, mint_and_set_balance_of } from './token';


// Profile
type PrincipalProfile = Record<{
    alias: string;
    about: string;
    is_manager: boolean;
    is_member: boolean;
    is_applicant: boolean;
}>


// Applicants
type Applicant = Record<{
    id: Principal;
    alias: string;
    about: string;
    createdAt: nat;
    updatedAt: Opt<nat>;
}>


type ApplicantPayload = Record<{
    alias: string;
    about: string;
}>


const applicants = new StableBTreeMap<Principal, Applicant>(0, 44, 1024);


// Members
type Member = Record<{
    id: Principal;
    alias: string;
    about: string;
    votes: nat;
    createdAt: nat;
    updatedAt: Opt<nat>;
}>


const members = new StableBTreeMap<Principal, Member>(1, 44, 1024);


type CompactMember = Record<{
    id: Principal;
    alias: string;
}>


// Proposals
type ProposalState = Variant<{
    Open: null;
    Accepted: null;
    Rejected: null;
    Executing: null;
    Succeeded: null;
    Failed: string;
}>;


type Proposal = Record<{
    id: string;
    createdAt: nat;
    updatedAt: Opt<nat>;

    proposer: Principal;
    title: string;
    description: string;
    canister_id: string; 
    canister_method: string;
    canister_method_param: string;

    state: ProposalState;
    votes_yes: nat;
    votes_no: nat;
    voters: Vec<Principal>
}>


type ProposalPayload = Record<{
    title: string;
    description: string;
    canister_id: string;
    canister_method: string;
    canister_method_param: string;
}>


const proposals = new StableBTreeMap<string, Proposal>(2, 44, 1024);


// Manager
type Manager = Record<{
    id: Principal;
    alias: string;
    about: string;
    createdAt: nat;
    updatedAt: Opt<nat>;
}>


const managers = new StableBTreeMap<Principal, Manager>(3, 44, 1024);


///////////////////////////////////////////////////////////////////////
$query;
export function get_principal_profile(): PrincipalProfile {
    let caller_principal = ic.caller();
    
    let profile: PrincipalProfile = {
        alias: "",
        about: "",
        is_manager: false,
        is_member: false,
        is_applicant: false,
    };

    profile.is_manager = managers.containsKey(caller_principal);

    match(managers.get(caller_principal), {
        Some: (manager) => {
            profile.alias = manager.alias;
            profile.about = manager.about;
            profile.is_manager = true;
        },
        None: () => {}
    });

    match(members.get(caller_principal), {
        Some: (member) => {
            profile.alias = member.alias;
            profile.about = member.about;
            profile.is_member = true;
        },
        None: () => {
            match(applicants.get(caller_principal), {
                Some: (applicant) => {
                    profile.alias = applicant.alias;
                    profile.about = applicant.about;
                    profile.is_applicant = true;
                },
                None: () => {}
            });
        }
    });

    return profile;
}


$update;
export function applicants_add(payload : ApplicantPayload): Result<Principal, string> {
    let applicant_principal = ic.caller();

    if( !applicants.containsKey(applicant_principal)) {

        if( !members.containsKey(applicant_principal)) {

            const new_applicant: Applicant = {
                id: applicant_principal,
                alias: payload.alias,
                about: payload.about,
                createdAt: ic.time(),
                updatedAt: Opt.None
            }

            applicants.insert(new_applicant.id, new_applicant);

            //TODO next iteration adds approval process, now it is automagically approved
            return members_add_from_applicant(applicant_principal);
        }
        else 
            return Result.Err<Principal, string>(`Applicant is already a Member.`)            
    }
    else 
        return Result.Err<Principal, string>(`Applicant already exists.`)        
}


function members_add_from_applicant(applicant_principal : Principal): Result<Principal, string> {
    return match(applicants.get(applicant_principal), {
        Some: (applicant) => {
            if( !members.containsKey(applicant_principal)) {
                const new_member: Member = {
                    id: applicant_principal,
                    alias: applicant.alias,
                    about: applicant.about,
                    votes: 0n,
                    createdAt: ic.time(),
                    updatedAt: Opt.None
                }
        
                // added as member
                members.insert(new_member.id, new_member);

                // added as manager if there are no managers
                if( managers.len() == 0n ) {
                    const new_manager: Member = { ...new_member}
                    managers.insert(new_manager.id, new_manager);
                }

                // removed from applicants
                applicants.remove(new_member.id);

                // add tokens
                member_set_initial_tokens(new_member.id);

                return Result.Ok<Principal, string>(applicant_principal)
            }
            else 
                return Result.Err<Principal, string>(`Member already exists.`)        
        },
        None: () => {
            return Result.Err<Principal, string>(`Applicant doesn't exist.`)        
        }
    });
}


$query;
export function members_get(): Result<Vec<Member>, string> {
    let caller = ic.caller();

    if( !caller_is_manager_or_member(caller)) {
        return Result.Err<Vec<Member>, string>(`Caller can't get Members.`);
    }
    
    return Result.Ok(members.values());
}


$query;
export function get_members_to_transfer(): Result<Vec<CompactMember>, string> {
    let caller = ic.caller();

    if( !caller_is_manager_or_member(caller)) {
        return Result.Err<Vec<CompactMember>, string>(`Caller can't get Members.`);
    }

    let ret: Vec<CompactMember> = [];

    const z = members.values().map((member) => {
        if( member.id.toString() !== caller.toString() ) {
            ret.push ({ id: member.id, alias: member.alias });
        }
    });

    return Result.Ok(ret);
}


$update;
export function proposals_add(payload : ProposalPayload): Result<string, string> {
    let caller = ic.caller();

    if( !caller_is_member(caller)) {
        return Result.Err<string, string>(`Caller can't add Proposals.`);
    }

    const new_proposal: Proposal = {
        id: uuidv4(),
        createdAt: ic.time(),
        updatedAt: Opt.None,

        proposer: ic.caller(),
        state: { Open: null },
        votes_yes: 0n,
        votes_no: 0n,
        voters: [],
        ...payload
    }

    proposals.insert(new_proposal.id, new_proposal);
    return Result.Ok<string, string>(new_proposal.id)
}


function AreCloseConditionsMet(proposal:Proposal): boolean {
    return (proposal.votes_yes > 2 || proposal.votes_no > 2);
}


function caller_is_member(caller: Principal): boolean {
    return members.containsKey(caller);
}


function caller_is_manager_or_member(caller: Principal): boolean {
    return managers.containsKey(caller) || members.containsKey(caller) ;
}


$update;
export function proposals_vote_yes(proposal_id:string): Result<Proposal, string> {
    let caller = ic.caller();

    if( !caller_is_member(caller)) {
        return Result.Err<Proposal, string>(`Caller can't vote.`);
    }
    
    let ret_proposal = proposals.get(proposal_id);

    if( isSome(ret_proposal) ) {
        let proposal: Proposal = getSome(ret_proposal);
        if( isThisVariant(proposal.state, 'Open') ) {
            proposal.votes_yes += 1n;            
            if( AreCloseConditionsMet(proposal) ) {
                if( proposal.votes_yes > proposal.votes_no )
                    proposal.state = { Accepted: null };
                else
                    proposal.state = { Rejected: null };
            }
            proposals.insert(proposal_id, proposal);

            return Result.Ok<Proposal, string>(proposal);
        }
        else
            return Result.Err<Proposal, string>(`Proposal is not Open`);
    }
    else
        return Result.Err<Proposal, string>(`Proposal doesn't exist`);
}


$update;
export function proposals_vote_no(proposal_id:string): Result<Proposal, string> {
    let caller = ic.caller();

    if( !caller_is_member(caller)) {
        return Result.Err<Proposal, string>(`Caller can't vote.`);
    }
    
    let ret_proposal = proposals.get(proposal_id);

    if( isSome(ret_proposal) ) {
        let proposal: Proposal = getSome(ret_proposal);
        if( isThisVariant(proposal.state, 'Open') ) {
            proposal.votes_no += 1n;            
            if( AreCloseConditionsMet(proposal) ) {
                if( proposal.votes_yes > proposal.votes_no )
                    proposal.state = { Accepted: null };
                else
                    proposal.state = { Rejected: null };
            }
            proposals.insert(proposal_id, proposal);

            return Result.Ok<Proposal, string>(proposal);
        }
        else
            return Result.Err<Proposal, string>(`Proposal is not Open`);
    }
    else
        return Result.Err<Proposal, string>(`Proposal doesn't exist`);
}


$query;
export function proposals_get(): Result<Vec<Proposal>, string> {
    let caller = ic.caller();

    if( !caller_is_member(caller)) {
        return Result.Err<Vec<Proposal>, string>(`Caller can't get proposals.`);
    }
    return Result.Ok(proposals.values());
}


function get_account_for_member(member: Principal): Account {
    const account: Account = {
        owner: member,
        subaccount: {None: null}
    }
    return account;
}


function member_set_initial_tokens(member: Principal) {
    const account = get_account_for_member(member);
    mint_and_set_balance_of(account, 100n);
}


// a workaround to make uuid package work with Azle
globalThis.crypto = {
    //@ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    }
};


const isOk = (o: any): boolean => {
    return o.hasOwnProperty('Ok');
};

const getOk = (o: any): any => {
    type ObjectKey = keyof typeof o;
    const myVar = 'Ok' as ObjectKey;
    return  o[myVar];
};
      

const isSome = (o: any): boolean => {
    return o.hasOwnProperty('Some');
};


const getSome = (o: any): any => {
    type ObjectKey = keyof typeof o;
    const myVar = 'Some' as ObjectKey;
    return  o[myVar];
};
      

const isThisVariant = (o: any, prop:string): boolean => {
    return o.hasOwnProperty(prop);
};


export {icrc1_name, icrc1_symbol, icrc1_balance_of, icrc1_total_supply, icrc1_transfer, icrc1_decimals, icrc1_fee, icrc1_minting_account} from './token';
