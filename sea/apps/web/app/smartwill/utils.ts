import { WalrusService } from './types';

export const walrusServices: WalrusService[] = [
  {
    id: 'service1',
    name: 'walrus.space',
    publisherUrl: '/publisher1',
    aggregatorUrl: '/aggregator1',
  },
  {
    id: 'service2',
    name: 'staketab.org',
    publisherUrl: '/publisher2',
    aggregatorUrl: '/aggregator2',
  },
  {
    id: 'service3',
    name: 'redundex.com',
    publisherUrl: '/publisher3',
    aggregatorUrl: '/aggregator3',
  },
  {
    id: 'service4',
    name: 'nodes.guru',
    publisherUrl: '/publisher4',
    aggregatorUrl: '/aggregator4',
  },
  {
    id: 'service5',
    name: 'banansen.dev',
    publisherUrl: '/publisher5',
    aggregatorUrl: '/aggregator5',
  },
  {
    id: 'service6',
    name: 'everstake.one',
    publisherUrl: '/publisher6',
    aggregatorUrl: '/aggregator6',
  },
];

export function getAggregatorUrl(path: string, selectedService: string): string {
  const service = walrusServices.find((s) => s.id === selectedService);
  const cleanPath = path.replace(/^\/+/, '').replace(/^v1\//, '');
  return `${service?.aggregatorUrl}/v1/${cleanPath}`;
}

export function getPublisherUrl(path: string, selectedService: string): string {
  const service = walrusServices.find((s) => s.id === selectedService);
  const cleanPath = path.replace(/^\/+/, '').replace(/^v1\//, '');
  return `${service?.publisherUrl}/v1/${cleanPath}`;
}
