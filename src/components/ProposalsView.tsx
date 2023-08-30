import { 
  useEffect, 
  useRef, 
  useState 
} from 'react';

import { 
  Stat, 
  StatGroup, 
  StatLabel, 
  StatNumber, 
  Tag, 
  Card, 
  CardBody, 
  Stack, 
  Heading, 
  Text, 
  Button, 
  ButtonGroup, 
  SimpleGrid, 
  useToast 
} from '@chakra-ui/react';

import { 
  Proposal 
} from '../declarations/backend/backend.did';

import {
  isOk,
  getOk
} from '../misc/utils';


const ProposalsView = (props: { server: object }) => {
  const _server = useRef(props.server);
  const [_proposals, _set_proposals] = useState<Proposal[]>([]);

  const [waiting, set_waiting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    load_data();
  }, []);

  const load_data = async () => {
    let ret = await (_server.current as any).proposals_get();
    if (isOk(ret)) {
      _set_proposals(getOk(ret));
    }
  };

  const vote_no = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (waiting) return; 

    try {
      set_waiting(true);

      const proposal_id = e.currentTarget.getAttribute("proposal-id")

      let real_server:any = _server.current;
      let ret = await real_server.proposals_vote_no(proposal_id);

      if( isOk(ret) ) {
        toast({
          title: 'Vote delivered',
          description: "We've delivered your vote.",
          status: 'success',
          duration: 6000,
          isClosable: true,
        });
      }
      else {
        toast({
          title: "Vote couldn't be applied",
          description: "Error: " + ret.Err,
          status: 'error',
          duration: 6000,
          isClosable: true,
        });
      }
      await load_data();

      set_waiting(false);

    } finally {
      set_waiting(false);
    }
  }

  const vote_yes = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (waiting) return; 
    
    try {
      set_waiting(true);    
      const proposal_id = e.currentTarget.getAttribute("proposal-id")

      let real_server:any = _server.current;
      let ret = await real_server.proposals_vote_yes(proposal_id);

      if( isOk(ret) ) {
        toast({
          title: 'Vote delivered',
          description: "We've delivered your vote.",
          status: 'success',
          duration: 6000,
          isClosable: true,
        });
      }
      else {
        toast({
          title: "Vote couldn't be applied",
          description: "Error: " + ret.Err,
          status: 'error',
          duration: 6000,
          isClosable: true,
        });
      }
      await load_data();
      
      set_waiting(false);

    } finally {
      set_waiting(false);
    }
  }

  return(
    <SimpleGrid columns={1} spacing={4} >
    { 
      _proposals.map((item) => {
        return  <Card key={item.id} direction={{ base: 'column', sm: 'row' }} overflow='hidden'  variant='outline' >
                  <Stack>
                    <CardBody>
                      <Heading size='md'>{item.title}</Heading>
                      <Text py='2' style={{whiteSpace:'pre-line'}}>
                      {item.description}      
                      </Text>
                      { item.state.hasOwnProperty('Open') ? <Tag colorScheme='blue'>Open</Tag>: null }
                      { item.state.hasOwnProperty('Accepted') ? <Tag colorScheme='green'>Accepted</Tag>: null }
                      { item.state.hasOwnProperty('Rejected') ? <Tag colorScheme='red'>Rejected</Tag>: null }

                      <StatGroup style={{paddingTop:'20px', width:'400px'}}>
                        <Stat>
                          <StatLabel>Yes</StatLabel>
                          <StatNumber>{item.votes_yes.toString()}</StatNumber>
                        </Stat>

                        <Stat>
                          <StatLabel>No</StatLabel>
                          <StatNumber>{item.votes_no.toString()}</StatNumber>
                        </Stat>
                      </StatGroup>

                      { item.state.hasOwnProperty('Open') ? 
                        <Stack>
                          <div>
                          <ButtonGroup spacing='5' style={{paddingTop:'20px'}}>
                            <Button variant='solid' width="100px" colorScheme='green' proposal-id={item.id} onClick={vote_yes}>
                              Yes
                            </Button>
                            <Button variant='solid' width="100px" colorScheme='red' proposal-id={item.id} onClick={vote_no}>
                              No
                            </Button>
                          </ButtonGroup>
                          </div>
                        </Stack>: null
                      }

                    </CardBody>
                    
                  </Stack>  
                </Card>;
      }) 
    }
  </SimpleGrid>
  )
};

export default ProposalsView;
