export interface Spot {
  id: string;
  name: string;
  address: string;
  image: string;
  lat: number;
  lng: number;
  tags?: string[];
}

export const spots: Spot[] = [
  {
    id: 'cafe-agapita',
    name: 'Cafe Agapita',
    address: '11 Kapitan Sayas St. Sabutan, Silang',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&q=80',
    lat: 14.2302,
    lng: 120.9842,
    tags: ['Cafe', 'Cozy'],
  },
  {
    id: 'tinatangi-cafe',
    name: 'Tinatangi Cafe',
    address: 'Silang, Cavite',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
    lat: 14.231,
    lng: 120.985,
    tags: ['Cafe', 'Alfresco', 'Cozy'],
  },
  {
    id: 'cafe-10-23',
    name: 'Cafe 10/23',
    address: 'Tagaytay, Cavite',
    image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&q=80',
    lat: 14.235,
    lng: 120.988,
    tags: ['Cafe'],
  },
  {
    id: 'twin-lakes-hotel',
    name: 'Twin Lakes Hotel',
    address: 'Tagaytay, Cavite',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
    lat: 14.228,
    lng: 120.982,
    tags: ['Hotel', 'Resort'],
  },
];
