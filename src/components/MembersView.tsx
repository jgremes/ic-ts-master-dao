import { 
  useEffect, 
  useRef, 
  useState 
} from 'react';

import { 
  Card, 
  CardBody, 
  Stack, 
  Heading, 
  Text, 
  SimpleGrid 
} from '@chakra-ui/react';

import { 
  Member 
} from '../declarations/backend/backend.did';

import {
  isOk,
  getOk
} from '../misc/utils';


const MembersView = (props: { server: object }) => {
  const _server = useRef(props.server);
  const [_members, _set_members] = useState<Member[]>([]);

  useEffect(() => {
    load_data();
  }, []);

  const load_data = async () => {
    let ret = await (_server.current as any).members_get();
    if (isOk(ret)) {
      _set_members(getOk(ret));
    }
  };

  return(
    <SimpleGrid columns={1} spacing={4} >
    { 
      _members.map((item) => {
        return  <Card key={item.id.toString()} direction={{ base: 'column', sm: 'row' }} overflow='hidden'  variant='outline'>
                  <Stack >
                    <CardBody>
                    <Heading size='md'>{item.alias}</Heading>
                    <Text py='2'>
                    {item.about}                        
                    </Text>
                    </CardBody>
                  </Stack>
                </Card>;
      }) 
    }
  </SimpleGrid>
)
};

export default MembersView;
