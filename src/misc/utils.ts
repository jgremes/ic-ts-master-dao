export const isOk = (o: any): boolean => {
  return o.hasOwnProperty('Ok');
};
      
export const getOk = (o: any): any => {
  type ObjectKey = keyof typeof o;
  const myVar = 'Ok' as ObjectKey;
  return  o[myVar];
};