import { 
  useEffect, 
  useState, 
  useRef 
} from 'react';

import { 
  Tab, 
  Tabs, 
  TabList,
  TabPanel,
  TabPanels, 
  Button 
} from '@chakra-ui/react'

import './App.css';

import ProposalsView from "./components/ProposalsView";
import ProposalAdd from  "./components/ProposalAdd";
import ApplicantAdd from "./components/ApplicantAdd";
import MembersView from "./components/MembersView";
import TransfersView from './components/TransfersView';

import { 
  idlFactory, 
  canisterId 
} from './declarations/backend';

import { 
  AuthClient 
} from '@dfinity/auth-client';

import { 
  Actor, 
  HttpAgent 
} from '@dfinity/agent';

import { 
  PrincipalProfile 
} from './declarations/backend/backend.did';

import type { Principal } from '@dfinity/principal';


function App() {
  const _auth_client = useRef({});
  const _server = useRef({});
  const _identity = useRef({});
  const _principal = useRef<Principal>();
  const _roles = useRef("");

  const [_is_authenticated, _set_is_authenticated] = useState(false);
  const [_is_manager, _set_is_manager] = useState(false);
  const [_is_member, _set_is_member] = useState(false);
  const [_is_unregistered, _set_is_unregistered] = useState(false);
  const [_alias, _set_alias] = useState("");

  const load_profile = async () => { 
    let profile = (await (_server.current as any).get_principal_profile()) as PrincipalProfile;
        
    let sep = "";
    let roles = "";
    if (profile.is_manager) {
      roles = "Manager";
      sep = " : ";
    }
    if (profile.is_member) {
      roles += sep + "Member";
    }

    _roles.current = roles;
    
    _set_is_authenticated(true);
    _set_is_manager(profile.is_manager);
    _set_is_member(profile.is_member); 
    _set_is_unregistered(!(profile.is_manager || profile.is_member || profile.is_applicant));
    _set_alias(profile.alias);
  };

  const login = async () => {
    const authClient = await AuthClient.create();
    const isLocalNetwork = process.env.DFX_NETWORK == 'local';
    const identityProviderUrl = isLocalNetwork ? 
        `http://127.0.0.1:4943/?canisterId=${process.env.CANISTER_ID_INTERNET_IDENTITY}` : 
        'https://identity.ic0.app/';

    _auth_client.current = authClient;

    authClient.login({
      identityProvider: identityProviderUrl,
      maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
      onSuccess: async () => {
        
        const identity = await authClient.getIdentity();
        const principal = identity.getPrincipal();
        
        const ha = new HttpAgent({
          identity,
        });
        await ha.fetchRootKey(); // it doesnt work without this call 
        const actor = Actor.createActor(idlFactory, {
          agent: ha,
          canisterId,
        });

        _identity.current = identity;
        _principal.current = principal;
        _server.current = actor;

        await load_profile();
       
      },
      onError(error) {
        //TODO
      },
    });
  };

  const logout = async () => {
    await (_auth_client.current as AuthClient).logout();

    _auth_client.current = {};
    _server.current = {};
    _identity.current = {};
    //_principal.current = {};
    _roles.current = "";

    _set_is_authenticated(false);
    _set_is_manager(false);
    _set_is_member(false); 
    _set_is_unregistered(false);
    _set_alias("");
  
  };
  
  return (
    <div className="App" style={{padding:'10px'}}>
      <h1>Master DAO</h1>
      {
        _is_authenticated?  <div style={{ display:'flow', alignContent:'right' }}>
                              <Button width="150px" mt={4} position={'relative'} float={'right'} onClick={logout}>
                              Logout
                              </Button>
                              {
                                _is_unregistered? <div style={{paddingTop:'100px'  }}>
                                                    <ApplicantAdd server={_server.current} cb={load_profile}/>
                                                  </div> 
                                                  :
                                                  <div>
                                                    <h2 style={{paddingTop:'20px' }}>Wellcome back {_alias}! </h2>
                                                    <h2 style={{paddingTop:'5px', paddingBottom:'40px' }}>You have the following role(s): {_roles.current} </h2>

                                                    <Tabs isLazy variant='enclosed'>
                                                      <TabList>
                                                        {_is_member? <Tab>Add Proposal</Tab> : null}

                                                        {_is_member? <Tab>View/Vote Proposals</Tab> : null}

                                                        {_is_manager? <Tab>View Members</Tab> : null}

                                                        {_is_member? <Tab>Transfer</Tab> : null}
                                                      </TabList>
                                                      <TabPanels>
                                                        {_is_member? <TabPanel>
                                                                    <ProposalAdd server={_server.current} />
                                                                    </TabPanel> : null}

                                                        {_is_member? <TabPanel>
                                                                    <ProposalsView server={_server.current} />
                                                                    </TabPanel> : null}

                                                        {_is_manager? <TabPanel>
                                                                    <MembersView server={_server.current} />
                                                                    </TabPanel> : null}

                                                        {_is_member? <TabPanel>
                                                                    <TransfersView server={_server.current} principal={_principal.current}/>
                                                                    </TabPanel> : null}
                                                      </TabPanels>
                                                    </Tabs>
                                                  </div>
                              }
                              </div> 
                              :
                              <div style={{paddingTop:'120px'}}>
                                <h2>Wellcome to Master DAO, please login to continue</h2>
                                <Button mt={4} width="150px" variant='solid' colorScheme='blue' onClick={login}>
                                Login
                                </Button>
                              </div>
                      
      }

    </div>
  );
}

export default App;
