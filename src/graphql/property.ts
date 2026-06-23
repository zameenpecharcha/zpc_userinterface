import { gql } from '@apollo/client';

// Property Type Enum
export enum PropertyType {
  APARTMENT = 'APARTMENT',
  VILLA = 'VILLA',
  HOUSE = 'HOUSE',
  LAND = 'LAND'
}

// Property Status Enum
export enum PropertyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SOLD = 'SOLD',
  RENTED = 'RENTED'
}

// Property Fields Fragment
export const PROPERTY_FIELDS = gql`
  fragment PropertyFields on Property {
    propertyId
    userId
    title
    description
    price
    location
    propertyType
    status
    bedrooms
    bathrooms
    area
    yearBuilt
    images
    amenities
    createdAt
    updatedAt
    viewCount
    latitude
    longitude
    address
    city
    state
    country
    zipCode
    isActive
    coverPhotoId
    profilePhotoId
  }
`;

// Create Property Mutation
export const CREATE_PROPERTY = gql`
  mutation CreateProperty(
    $userId: String!
    $title: String!
    $description: String!
    $price: Float!
    $location: String!
    $propertyType: PropertyType!
    $status: PropertyStatus!
    $bedrooms: Int!
    $bathrooms: Int!
    $area: Float!
    $yearBuilt: Int!
    $images: [String!]!
    $amenities: [String!]!
    $latitude: Float!
    $longitude: Float!
    $address: String!
    $city: String!
    $state: String!
    $country: String!
    $zipCode: String!
    $isActive: Boolean
  ) {
    createProperty(
      userId: $userId
      title: $title
      description: $description
      price: $price
      location: $location
      propertyType: $propertyType
      status: $status
      bedrooms: $bedrooms
      bathrooms: $bathrooms
      area: $area
      yearBuilt: $yearBuilt
      images: $images
      amenities: $amenities
      latitude: $latitude
      longitude: $longitude
      address: $address
      city: $city
      state: $state
      country: $country
      zipCode: $zipCode
      isActive: $isActive
    ) {
      ...PropertyFields
    }
  }
  ${PROPERTY_FIELDS}
`;

// Get Property Query
export const GET_PROPERTY = gql`
  query GetProperty($propertyId: String!) {
    property(propertyId: $propertyId) {
      ...PropertyFields
    }
  }
  ${PROPERTY_FIELDS}
`;

// Get User Properties Query
export const GET_USER_PROPERTIES = gql`
  query GetUserProperties($userId: String!) {
    userProperties(userId: $userId) {
      ...PropertyFields
    }
  }
  ${PROPERTY_FIELDS}
`;

// Get User Followed Properties Query
export const GET_USER_FOLLOWED_PROPERTIES = gql`
  query GetUserFollowedProperties($userId: String!) {
    userFollowedProperties(userId: $userId) {
      ...PropertyFields
    }
  }
  ${PROPERTY_FIELDS}
`;

// Get Property Followers Query
export const GET_PROPERTY_FOLLOWERS = gql`
  query GetPropertyFollowers($propertyId: Int!) {
    propertyFollowers(propertyId: $propertyId) {
      id
      userId
      propertyId
      status
      followedAt
    }
  }
`;

// Get Property Ratings Query
export const GET_PROPERTY_RATINGS = gql`
  query GetPropertyRatings($propertyId: Int!) {
    propertyRatings(propertyId: $propertyId) {
      id
      propertyId
      ratedByUserId
      ratingValue
      title
      review
      ratingType
      isAnonymous
      createdAt
      updatedAt
    }
  }
`;

// Follow Property Mutation
export const FOLLOW_PROPERTY = gql`
  mutation FollowProperty($userId: Int!, $propertyId: Int!, $status: String) {
    followProperty(userId: $userId, propertyId: $propertyId, status: $status) {
      id
      userId
      propertyId
      status
      followedAt
    }
  }
`;

// Create Property Rating Mutation
export const CREATE_PROPERTY_RATING = gql`
  mutation CreatePropertyRating(
    $propertyId: Int!
    $ratedByUserId: Int!
    $ratingValue: Int!
    $title: String
    $review: String
    $ratingType: String
    $isAnonymous: Boolean
  ) {
    createPropertyRating(
      propertyId: $propertyId
      ratedByUserId: $ratedByUserId
      ratingValue: $ratingValue
      title: $title
      review: $review
      ratingType: $ratingType
      isAnonymous: $isAnonymous
    ) {
      id
      propertyId
      ratedByUserId
      ratingValue
      title
      review
      ratingType
      isAnonymous
      createdAt
      updatedAt
    }
  }
`;

// Add Property Media Mutation
export const ADD_PROPERTY_MEDIA = gql`
  mutation AddPropertyMedia($propertyId: Int!, $media: [PropertyMediaInput!]!) {
    addPropertyMedia(propertyId: $propertyId, media: $media) {
      success
      message
    }
  }
`;

// Property Media Input Type
export interface PropertyMediaInput {
  mediaType: string;
  mediaUrl: string;
  mediaOrder: number;
  caption?: string;
}

// Property Interface
export interface Property {
  propertyId: string;
  userId: string;
  title: string;
  description: string;
  price: number;
  location: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  bedrooms: number;
  bathrooms: number;
  area: number;
  yearBuilt: number;
  images: string[];
  amenities: string[];
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isActive: boolean;
  coverPhotoId?: number;
  profilePhotoId?: number;
}

// Property Rating Interface
export interface PropertyRating {
  id: number;
  propertyId: number;
  ratedByUserId: number;
  ratingValue: number;
  title: string;
  review: string;
  ratingType: string;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

// Property Follow Interface
export interface PropertyFollow {
  id: number;
  userId: number;
  propertyId: number;
  status: string;
  followedAt: string;
}

// Create Property Input Interface
export interface CreatePropertyInput {
  userId: string;
  title: string;
  description: string;
  price: number;
  location: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  bedrooms: number;
  bathrooms: number;
  area: number;
  yearBuilt: number;
  images: string[];
  amenities: string[];
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isActive?: boolean;
}
