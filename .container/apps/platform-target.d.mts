export const platformTarget: Readonly<{port:number;apiPort:number}>;
export function platformPasswordChangeRequired(version:string):'0'|'1';
export function installedCodeshipOrigin(root:string):string;
