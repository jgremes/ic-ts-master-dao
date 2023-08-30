import { 
  useRef, 
  useState 
} from 'react';

import {
  Input,
  Button,
  FormControl,
  FormLabel,
  Textarea,
  useToast
} from '@chakra-ui/react'

import { 
  ProposalPayload 
} from '../declarations/backend/backend.did';

import {
  isOk
} from '../misc/utils';


const ProposalAdd = (props: { server: object }) => {
  const _server = useRef(props.server);
  const [_proposal_payload, _set_proposal_payload] = useState<ProposalPayload>(
    {
      title:"",
      description:"",
      canister_id:"",
      canister_method:"",
      canister_method_param:""
    });

  const [waiting, set_waiting] = useState(false);
  const toast = useToast();

  const title_onChange = (e: React.FormEvent<HTMLInputElement>): void => {
    let o = _proposal_payload;
    o.title = e.currentTarget.value;
    _set_proposal_payload(o);
  };

  const description_onChange = (e: React.FormEvent<HTMLTextAreaElement>): void => {
    let o = _proposal_payload;
    o.description = e.currentTarget.value;
    _set_proposal_payload(o);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await add();    
  };

  const add = async () => {
    if (waiting) return; 
    try {
      set_waiting(true);
    
      let pp = _proposal_payload;

      let server: any = _server.current;
      let ret = await server.proposals_add(pp);

      if( isOk(ret) ) {
        toast({
          title: 'Proposal created',
          description: "We've created your Proposal for you.",
          status: 'success',
          duration: 6000,
          isClosable: true,
        });
      }
      else {
        toast({
          title: 'Proposal not created',
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
  };

  return(
    <div>
      <form onSubmit={handleSubmit}>
        <FormControl isRequired style={{paddingTop:'10px'}} >
          <FormLabel>Title</FormLabel>
          <Input type='text' onChange={title_onChange}/>
        </FormControl>
        <FormControl isRequired style={{paddingTop:'30px', paddingBottom:'30px'}}>
          <FormLabel>Description</FormLabel>
          <Textarea  onChange={description_onChange}/>
        </FormControl>
        <Button type="submit" width="150px" mt={4} variant='solid' colorScheme='blue' >
        Add
        </Button>
      </form>
    </div>
  )
};

export default ProposalAdd;
