// Explicit bootstrap of operator-approved profiles; preserves existing user-managed rows.
import {profiles,resolveProfile} from '../../service.ts';
import {targetRepository} from '../../repository.ts';
import type {Database} from '../../../../../identity.ts';
export async function seed(db:Database){for(const profile of await profiles()){await resolveProfile(profile.key);await targetRepository(db).register(profile);}return 'Registered approved deployment profiles.';}
