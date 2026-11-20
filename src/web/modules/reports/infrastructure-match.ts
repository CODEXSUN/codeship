import type { InfrastructureService } from '../../../../contracts/infrastructure';
import type { DockerMetric } from '../../../../contracts/docker-metrics';

const serviceNames: Record<InfrastructureService['kind'], readonly string[]> = {
  postgres: ['postgres'],
  mariadb: ['mariadb'],
  redis: ['redis'],
  'file-manager': ['filemanager', 'file-manager', 'filebrowser', 'media'],
};

// Snapshot metrics already belong to this operator host. Match its exact Compose
// project and service kind, including VPS records; never guess across projects.
export function infrastructureRecord(
  metric: Pick<DockerMetric, 'project' | 'service'>,
  records: readonly InfrastructureService[],
): InfrastructureService | undefined {
  const matches = records.filter(record =>
    record.project === metric.project && serviceNames[record.kind].includes(metric.service),
  );
  return matches.length === 1 ? matches[0] : undefined;
}
