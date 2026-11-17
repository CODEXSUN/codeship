import type {Database} from '../../../identity.ts';
import {targetRepository} from './repository.ts';
export {resolveProfile} from './service.ts';
// Read-only public access for the deployment and monitoring modules.
export function targetAccess(db:Database){const repo=targetRepository(db);return {find:repo.find,list:repo.list};}
