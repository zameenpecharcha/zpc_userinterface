export enum PropertyType {
  APARTMENT = 'APARTMENT',
  VILLA = 'VILLA',
  PLOT = 'PLOT',
  HOUSE = 'HOUSE',
  PENTHOUSE = 'PENTHOUSE',
  COMMERCIAL = 'COMMERCIAL',
  OFFICE = 'OFFICE',
  SHOP = 'SHOP',
  WAREHOUSE = 'WAREHOUSE',
  LAND = 'LAND',
}

export enum ListingType {
  SALE = 'SALE',
  RENT = 'RENT',
  LEASE = 'LEASE',
}

export enum PropertyStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  SOLD = 'SOLD',
  RENTED = 'RENTED',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export interface Property {
  id: string;
  propertyCode: string;
  title: string;
  description: string;
  createdBy: string;
  creatorFirstName?: string;
  creatorLastName?: string;
  creatorEmail?: string;
  creatorRole?: string;
  builderName?: string;
  projectName?: string;
  propertyType: string;
  listingType: string;
  price: number;
  currency: string;
  city: string;
  state: string;
  country: string;
  status: string;
  verificationStatus: string;
  averageRating: number;
  ratingCount: number;
  viewCount: number;
  saveCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PropertyListPage {
  properties: Property[];
  total: number;
  page: number;
  limit: number;
}

export interface PropertyRating {
  id: string;
  propertyId: string;
  userId: string;
  overallRating: number;
  title: string;
  review: string;
  isAnonymous: boolean;
  createdAt?: string;
}

export interface CreatePropertyInput {
  title: string;
  description?: string;
  builderName?: string;
  projectName?: string;
  propertyType?: string;
  listingType?: string;
  price?: number;
  currency?: string;
  city?: string;
  state?: string;
  country?: string;
  location?: string;
  bedrooms?: number;
  bathrooms?: number;
}

export interface PropertyMediaInput {
  filePath: string;
  mediaType?: string;
  displayOrder?: number;
  fileName?: string;
  contentType?: string;
  isCover?: boolean;
}

export interface FeatureInput {
  featureName: string;
  featureValue?: string;
  displayOrder?: number;
}

export interface GenericResult {
  success: boolean;
  message: string;
}
