type LoginInput={identifier:string;password:string;corporateId?:string};
type RouteLocation={pathname:string};
/** An explicit login URL asks for credentials; it never grants workspace access. */
export function withLoginRoute<T extends {session():Promise<unknown>;login(input:LoginInput):Promise<void>}>(client:T,location:RouteLocation,complete:()=>void){
 const realm=({'/sa/login':'sa','/admin/login':'admin','/login':'user'} as const)[location.pathname as '/sa/login'|'/admin/login'|'/login'];
 let awaitingLogin=realm!==undefined;
 return {...client,
  async session():Promise<Awaited<ReturnType<T['session']>>>{if(awaitingLogin)throw Object.assign(new Error('Sign in to continue.'),{statusCode:401});return await client.session() as Awaited<ReturnType<T['session']>>;},
  async login(input:LoginInput){
   const request={...input,...(realm?{realm}:{})};
   await client.login(request);
   awaitingLogin=false;
   if(realm)complete();
  },
 };
}
