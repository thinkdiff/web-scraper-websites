import { BusinessRecord } from '../../src/config/types.js';

export const mockNoWebsiteBusiness: BusinessRecord = {
  source: 'google_maps',
  sourcePlaceId: 'place_rajput_jewellers_001',
  name: 'Rajput Jewellers Pvt. Ltd.',
  category: 'Jewellery Showroom',
  categories: ['Jewellery Showroom', 'Jewelry Store'],
  address: 'Dr. Yagnik Road, Jagnath Plot',
  street: 'Dr. Yagnik Road',
  city: 'Rajkot',
  state: 'Gujarat',
  postalCode: '360001',
  country: 'India',
  latitude: 22.298,
  longitude: 70.798,
  phone: '098250 12345',
  website: undefined,
  rating: 4.8,
  reviewCount: 128,
  mapsUrl: 'https://maps.google.com/?cid=1001',
};

export const mockOfficialWebsiteBusiness: BusinessRecord = {
  source: 'google_maps',
  sourcePlaceId: 'place_kalyan_jewellers_002',
  name: 'Kalyan Jewellers',
  category: 'Jewellery',
  address: 'Palace Road',
  city: 'Rajkot',
  state: 'Gujarat',
  country: 'India',
  phone: '+91 281 2234567',
  website: 'https://www.kalyanjewellers.net',
  rating: 4.5,
  reviewCount: 450,
  mapsUrl: 'https://maps.google.com/?cid=1002',
};

export const mockInstagramOnlyBusiness: BusinessRecord = {
  source: 'google_maps',
  sourcePlaceId: 'place_shree_boutique_003',
  name: 'Shree Boutique & Ethnic Wear',
  category: 'Boutique',
  address: 'Amin Marg',
  city: 'Rajkot',
  state: 'Gujarat',
  country: 'India',
  phone: '9876543210',
  website: 'https://instagram.com/shreeboutiquerajkot',
  rating: 4.6,
  reviewCount: 52,
  mapsUrl: 'https://maps.google.com/?cid=1003',
};

export const mockDirectoryOnlyBusiness: BusinessRecord = {
  source: 'google_maps',
  sourcePlaceId: 'place_om_real_estate_004',
  name: 'Om Real Estate Developers',
  category: 'Real Estate Agency',
  address: 'Kalawad Road',
  city: 'Rajkot',
  state: 'Gujarat',
  country: 'India',
  phone: '+919898011223',
  website: 'https://www.justdial.com/Rajkot/Om-Real-Estate',
  rating: 4.3,
  reviewCount: 35,
  mapsUrl: 'https://maps.google.com/?cid=1004',
};

export const mockDuplicateByPlaceId: BusinessRecord = {
  ...mockNoWebsiteBusiness,
  name: 'Rajput Jewellers Main Branch',
};

export const mockDuplicateByNameAndPhone: BusinessRecord = {
  source: 'google_maps',
  sourcePlaceId: 'different_place_id_999',
  name: 'Rajput Jewellers',
  category: 'Jewellery',
  address: 'Different address string',
  city: 'Rajkot',
  phone: '+91 98250 12345',
  rating: 4.8,
  reviewCount: 128,
};

export const mockClosedBusiness: BusinessRecord = {
  source: 'google_maps',
  sourcePlaceId: 'place_closed_store_005',
  name: 'Heritage Textiles',
  category: 'Boutique',
  address: 'Dharmendra Road',
  city: 'Rajkot',
  phone: '+91 98250 55555',
  permanentlyClosed: true,
  rating: 3.5,
  reviewCount: 10,
};

export const mockNoPhoneBusiness: BusinessRecord = {
  source: 'google_maps',
  sourcePlaceId: 'place_no_phone_006',
  name: 'Krishna Fashion Hub',
  category: 'Boutique',
  address: 'Tagore Road',
  city: 'Rajkot',
  phone: undefined,
  rating: 4.0,
  reviewCount: 12,
};
