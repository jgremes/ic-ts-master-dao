import { 
  useEffect, 
  useRef, 
  useState 
} from 'react';

import { 
  Stat, 
  StatLabel, 
  StatNumber,
  StatHelpText,
  Button, 
  FormControl,
  FormLabel, 
  useToast, 
  Select,
  Divider,
  NumberInput,
  NumberInputField
} from '@chakra-ui/react';

import { 
  Account,
  CompactMember,
  TransferArgs
} from '../declarations/backend/backend.did';

import {
  isOk,
  getOk,
} from '../misc/utils';

import { Principal } from '@dfinity/principal';

const TransfersView = (props: { server: object, principal: any }) => {
  const _server = useRef(props.server);
  const _principal = useRef<Principal>(props.principal);

  const [_balance, _set_balance] = useState<bigint>(0n);
  const [_token_symbol, _set_token_symbol] = useState<string>("");
  const [_token_name, _set_token_name] = useState<string>("");

  const [_members_to_transfer, _set_members_to_transfer] = useState<CompactMember[]>([]);
  const [_to, _set_to] = useState<string>("");
  const [_amount, _set_amount] = useState<bigint>(0n);

  const [waiting, set_waiting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    load_data();
  }, []);

  const get_account_for_member = ():Account => {
    const account: Account = {
        owner: _principal.current,
        subaccount: []
    }
    return account;
  };

  const get_account_from_string = (principal:string):Account => {
    const account: Account = {
        owner: Principal.fromText(principal),
        subaccount: []
    }
    return account;
  };

  const load_data = async () => {
    let account = get_account_for_member();

    let server = (_server.current as any);

    let symbol = await server.icrc1_symbol();
    _set_token_symbol(symbol);

    let name = await server.icrc1_name();
    _set_token_name(name);

    let balance = await server.icrc1_balance_of(account);
    _set_balance(balance);
    
    let ret = await server.get_members_to_transfer();
    if (isOk(ret)) {
      _set_members_to_transfer(getOk(ret));
    }
  };

  const transfer = async () => {
    if (waiting) return; 
    
    try {
      set_waiting(true);
    
      if(_amount > _balance || _amount <= 0) {
        alert("Invalid amount")
        return;
      }

      let to = get_account_from_string(_to);

      let ta:TransferArgs = {
        to: to,
        from_subaccount: [],
        fee:[],
        memo:[],
        amount: _amount,
        created_at_time: [],
      };

      let server: any = _server.current;
      let ret = await server.icrc1_transfer(ta);

      if( isOk(ret) ) {
        toast({
          title: 'Transfer',
          description: "We've transfered your Tokens for you.",
          status: 'success',
          duration: 6000,
          isClosable: true,
        });
        await load_data();
      }
      else {
        toast({
          title: 'Transfer',
          description: "Error: " + ret.err,
          status: 'error',
          duration: 6000,
          isClosable: true,
        });

      }
      set_waiting(false);

    } finally {
      set_waiting(false);
    }
  }


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    await transfer();    
  };

  const to_onChange = (e: React.FormEvent<HTMLSelectElement>): void => {
    _set_to(e.currentTarget.value);
  };

  const amount_onChange = (e: React.FormEvent<HTMLInputElement>): void => {
    let n  = BigInt(e.currentTarget.value);
    _set_amount(n);
  };

  return(
    <div>
      <Stat>
        <StatLabel>{_token_name}</StatLabel>
        <StatNumber>{_balance.toString()}</StatNumber>
        <StatHelpText>{_token_symbol}</StatHelpText>
      </Stat>

      <Divider />
      <form onSubmit={handleSubmit}>
        <FormControl isRequired style={{paddingTop:'30px'}}>
          <FormLabel>To</FormLabel>
          <Select isRequired placeholder='Select option' onChange={to_onChange}>
            {
              _members_to_transfer.map((member) => {
              return <option key={ member.id.toString() } value={ member.id.toString() }>{ member.alias }</option>  ;
            })
          }
          </Select>
        </FormControl>
        <FormControl isRequired style={{paddingTop:'30px'}}>
          <FormLabel>Amount</FormLabel>
          <NumberInput  >
            <NumberInputField onChange={amount_onChange}/>
          </NumberInput>
        </FormControl>
        <Button type="submit" mt={4} width="150px" variant='solid' colorScheme='blue'>
          Transfer
        </Button>
      </form>

  </div>
  )
};

export default TransfersView;
