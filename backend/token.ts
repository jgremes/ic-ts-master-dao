import { 
    ic,
    $update,
    $query,
    nat,
    nat8,
    nat64,
    Record,
    Principal,
    Opt,
    blob,
    StableBTreeMap,
    Variant,
    match,
} from "azle";


export type Account = Record<{
    owner: Principal;
    subaccount: Opt<blob>;
}>;


export type AccountBalance = Record<{
    account: Account;
    balance: nat;
}>;


export type TransferArgs = Record<{
    amount: nat;
    created_at_time: Opt<nat64>;
    fee: Opt<nat>;
    from_subaccount: Opt<blob>;
    memo: Opt<blob>;
    to: Account;
}>;


export type TransferError = Variant<{
    BadBurn: Record<{ min_burn_amount: nat }>;
    BadFee: Record<{ expected_fee: nat }>;
    CreatedInFuture: Record<{ ledger_time: nat64 }>;
    Duplicate: Record<{ duplicate_of: nat }>;
    GenericError: Record<{ error_code: nat; message: string }>;
    InsufficientFunds: Record<{ balance: nat }>;
    TemporarilyUnavailable: null;
    TooOld: null;
}>;


export type TransferResult = Variant<{
    Ok: nat;
    Err: TransferError;
}>;
    

const account_balances = new StableBTreeMap<Account, AccountBalance>(4, 100, 1024);    


$query;
export function icrc1_decimals(): nat8 {
    return 0;
}


$query;
export function icrc1_fee(): nat {
    return 0n;
}


$query;
export function icrc1_minting_account(): Opt<Account> {
    return { None:null };
}

$query;
export function icrc1_balance_of(account: Account): nat {
    return get_balance_of(account);
}


$query;
export function icrc1_name(): string {
    return "Master DAO Token";
}


$update;
export function icrc1_transfer(args: TransferArgs): TransferResult {
    const from: Account = {
        owner: ic.caller(),
        subaccount: args.from_subaccount
    };

    const to: Account = args.to;

    let from_balance = get_balance_of(from);
    let ret_bal = 0n;

    if( (from_balance - args.amount) >= 0) {
        set_balance_of(from, from_balance - args.amount);
        set_balance_of(to, get_balance_of(to) + args.amount);
        ret_bal = args.amount;
    }

    return { Ok: ret_bal}
};


$query;
export function icrc1_symbol(): string {
    return "MDT";
}


$query;
export function icrc1_total_supply(): nat {
    return 1_000_000n;
}


function get_balance_of(account: Account): nat {
    let balance = 0n;

    let ret = account_balances.get(account);
    match( ret, {
        Some: (ab) => { balance = ab.balance },
        None: () => {}
    });
    return balance;
}


function set_balance_of(account: Account, balance: nat): void {
    let ab: AccountBalance = {
        account: account,
        balance: balance
    };
    let ret = account_balances.insert(account, ab);
}


export function mint_and_set_balance_of(account: Account, balance: nat): void {
    // TODO mint
    let ab: AccountBalance = {
        account: account,
        balance: balance
    };
    let ret = account_balances.insert(account, ab);
}
