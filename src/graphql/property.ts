import { gql } from '@apollo/client';

export const PROPERTY_FIELDS = gql`
  fragment PropertyFields on Property {
    id
    propertyCode
    title
    description
    createdBy
    creatorFirstName
    creatorLastName
    creatorEmail
    creatorRole
    builderName
    projectName
    reraId
    propertyType
    listingType
    price
    currency
    city
    state
    country
    status
    verificationStatus
    averageRating
    ratingCount
    viewCount
    saveCount
    createdAt
    updatedAt
  }
`;

export const CREATE_PROPERTY = gql`
  mutation CreateProperty($input: CreatePropertyInput!) {
    createProperty(input: $input) {
      ...PropertyFields
    }
  }
  ${PROPERTY_FIELDS}
`;

export const GET_PROPERTY = gql`
  query GetProperty($propertyId: String!) {
    property(propertyId: $propertyId) {
      ...PropertyFields
    }
  }
  ${PROPERTY_FIELDS}
`;

export const GET_PROPERTY_BY_CODE = gql`
  query GetPropertyByCode($propertyCode: String!) {
    propertyByCode(propertyCode: $propertyCode) {
      ...PropertyFields
    }
  }
  ${PROPERTY_FIELDS}
`;

export const PUBLIC_PROPERTIES = gql`
  query PublicProperties(
    $page: Int
    $limit: Int
    $city: String
    $propertyType: String
    $listingType: String
  ) {
    publicProperties(
      page: $page
      limit: $limit
      city: $city
      propertyType: $propertyType
      listingType: $listingType
    ) {
      properties {
        ...PropertyFields
      }
      total
      page
      limit
    }
  }
  ${PROPERTY_FIELDS}
`;

export const GET_USER_PROPERTIES = gql`
  query GetUserProperties($userId: String!, $page: Int, $limit: Int) {
    userProperties(userId: $userId, page: $page, limit: $limit) {
      properties {
        ...PropertyFields
      }
      total
      page
      limit
    }
  }
  ${PROPERTY_FIELDS}
`;

export const MY_PROPERTIES = gql`
  query MyProperties($page: Int, $limit: Int) {
    myProperties(page: $page, limit: $limit) {
      properties {
        ...PropertyFields
      }
      total
      page
      limit
    }
  }
  ${PROPERTY_FIELDS}
`;

export const SAVED_PROPERTIES = gql`
  query SavedProperties($page: Int, $limit: Int) {
    savedProperties(page: $page, limit: $limit) {
      properties {
        ...PropertyFields
      }
      total
      page
      limit
    }
  }
  ${PROPERTY_FIELDS}
`;

export const GET_PROPERTY_RATINGS = gql`
  query GetPropertyRatings($propertyId: String!) {
    propertyRatings(propertyId: $propertyId) {
      id
      propertyId
      userId
      overallRating
      title
      review
      isAnonymous
      createdAt
    }
  }
`;

export const UPDATE_PROPERTY_STATUS = gql`
  mutation UpdatePropertyStatus($propertyId: String!, $status: String!) {
    updatePropertyStatus(propertyId: $propertyId, status: $status) {
      ...PropertyFields
    }
  }
  ${PROPERTY_FIELDS}
`;

export const DELETE_PROPERTY = gql`
  mutation DeleteProperty($propertyId: String!) {
    deleteProperty(propertyId: $propertyId) {
      success
      message
    }
  }
`;

export const SAVE_PROPERTY = gql`
  mutation SaveProperty($propertyId: String!) {
    saveProperty(propertyId: $propertyId) {
      success
      message
    }
  }
`;

export const REMOVE_SAVED_PROPERTY = gql`
  mutation RemoveSavedProperty($propertyId: String!) {
    removeSavedProperty(propertyId: $propertyId) {
      success
      message
    }
  }
`;

export const CREATE_PROPERTY_RATING = gql`
  mutation CreatePropertyRating(
    $propertyId: String!
    $overallRating: Float!
    $title: String
    $review: String
    $isAnonymous: Boolean
  ) {
    createPropertyRating(
      propertyId: $propertyId
      overallRating: $overallRating
      title: $title
      review: $review
      isAnonymous: $isAnonymous
    ) {
      success
      message
    }
  }
`;

export const ADD_PROPERTY_MEDIA = gql`
  mutation AddPropertyMedia($propertyId: String!, $media: [PropertyMediaInput!]!) {
    addPropertyMedia(propertyId: $propertyId, media: $media) {
      success
      message
    }
  }
`;

export const ADD_PROPERTY_FEATURES = gql`
  mutation AddPropertyFeatures($propertyId: String!, $features: [FeatureInput!]!) {
    addPropertyFeatures(propertyId: $propertyId, features: $features) {
      success
      message
    }
  }
`;

export const RECORD_PROPERTY_VIEW = gql`
  mutation RecordPropertyView($propertyId: String!) {
    recordPropertyView(propertyId: $propertyId) {
      success
      message
    }
  }
`;

export {
  PropertyType,
  ListingType,
  PropertyStatus,
  VerificationStatus,
} from '../types/property';

export type {
  Property,
  PropertyListPage,
  PropertyRating,
  CreatePropertyInput,
  PropertyMediaInput,
  FeatureInput,
  GenericResult,
} from '../types/property';
