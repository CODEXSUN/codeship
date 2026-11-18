export const codeshipContainerPort=4350;
// Local publication prefixes the internal port with 1 (4350 -> 14350).
export const codeshipHostPort=Number('1'+codeshipContainerPort);
export const codeshipOrigin='http://127.0.0.1:'+codeshipHostPort;
