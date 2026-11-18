# Automation worker runtime

The Automation operator adapter now prepares a tenant-specific Redis identity and supervises the API/worker together within the existing independent app container. The encrypted app environment and private recovery copy are saved before Redis ACL effects. Its password is never supplied in command arguments or output; Redis maintenance commands travel through stdin. Existing users, bindings and data remain intact. The ACL hash is persisted in the CodeShip-owned mounted ACL file, and a matching runtime ACL is applied without restarting shared Redis.

Automation uses the private `applications_backend` Redis alias. Only its namespaced keys/channels are accessible to the generated account; ACL/configuration/destructive server operations are removed. The existing administrator credential remains only in CodeShip's encrypted infrastructure registry. Future shared Redis replacement must restore this private network attachment through the Automation adapter.

The runtime wrapper selects Automation's owned supervisor and allows a bounded drain period; other products retain their existing entry and timeout. Product readiness includes a fresh worker heartbeat and Redis availability, so the existing CodeShip verification gate also checks the managed worker. The application update remains a tagged image operation with existing migration planning, writer quiescence, backup and recovery stages.

Only the Automation-related container adapters belong to this change. Concurrent native registry/database/UI edits are not included in its source publication or application release set.
