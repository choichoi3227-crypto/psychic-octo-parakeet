export type Hosting = {id:string; userId:string; slug:string; repoFullName:string; userWorkerUrl:string; proxyWorkerUrl:string; bloggerBlogId:string; createdAt:string; lastSyncAt:string; adminUsername:string; adminPassword?:string; databaseUsername:string; databasePassword?:string;};
export type ProvisionLog = {step:number; title:string; status:'pending'|'running'|'done'|'failed'; detail:string};
