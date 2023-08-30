import { 
  useRef, useState
} from 'react';

import {
  Input,
  Button,
  FormControl,
  FormLabel,
  useToast
} from '@chakra-ui/react'

import { 
  ApplicantPayload 
} from '../declarations/backend/backend.did';

import {
  isOk
} from '../misc/utils';


const ApplicantAdd = (props: { server: object, cb: Function }) => {
  const _server = useRef(props.server);
  const [_applicant, _set_applicant] = useState<ApplicantPayload>(
    {
      alias:"",
      about: ""
    });

  const [waiting, set_waiting] = useState(false);
  const toast = useToast();

  const alias_onChange = (e: React.FormEvent<HTMLInputElement>): void => {
    //TODO use deep copy instead
    let o = _applicant;
    o.alias = e.currentTarget.value;
    _set_applicant(o);
  };

  const about_onChange = (e: React.FormEvent<HTMLInputElement>): void => {
    //TODO use deep copy instead
    let o = _applicant;
    o.about = e.currentTarget.value;
    _set_applicant(o);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    await add();    
  };

  const apply_profile = (): void => {
    props.cb();
  }

  const add = async () => {
    if (waiting) return; 
    try {
      set_waiting(true);
    
      let a = _applicant;

      let server: any = _server.current;

      let ret = await server.applicants_add(a);

      console.log(JSON.stringify(ret));
      if( isOk(ret) ) {
        toast({
          title: 'Registration created',
          description: "We've created your Registration.",
          status: 'success',
          duration: 6000,
          isClosable: true,
        });

        apply_profile();
      }
      else {
        toast({
          title: 'Registration not created.',
          description: "Error: " + ret.Err,
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
      <div style={{paddingTop:'5px', paddingBottom:'40px' }}>Please fill out this form to Register</div>
      <form onSubmit={handleSubmit}>
        <FormControl >
          <FormLabel>Alias</FormLabel>
          <Input type='text' onChange={alias_onChange}/>
        </FormControl>
        <FormControl>
          <FormLabel>About</FormLabel>
          <Input type='text' onChange={about_onChange}/>
        </FormControl>
        <Button type="submit" mt={4} width="150px" variant='solid' colorScheme='blue'>
        Register
        </Button>
    </form>
    </div>
  )
};

export default ApplicantAdd;
