import { ApolloClient } from '@apollo/client';
import {
  CREATE_PROPERTY,
  UPDATE_PROPERTY,
  GET_PROPERTY,
  ADD_PROPERTY_MEDIA,
  UPDATE_PROPERTY_STATUS,
  MY_PROPERTIES,
  SAVE_PROPERTY,
  REMOVE_SAVED_PROPERTY,
  CREATE_PROPERTY_RATING,
  RECORD_PROPERTY_VIEW,
  ADD_PROPERTY_FEATURES,
} from '../graphql/property';
import {
  CreatePropertyInput,
  UpdatePropertyInput,
  Property,
  PropertyListPage,
  PropertyMediaInput,
  FeatureInput,
  GenericResult,
} from '../types/property';

export class PropertyService {
  private client: ApolloClient<any>;

  constructor(client: ApolloClient<any>) {
    this.client = client;
  }

  async createProperty(input: CreatePropertyInput): Promise<Property> {
    const { data } = await this.client.mutate({
      mutation: CREATE_PROPERTY,
      variables: { input },
    });
    if (!data?.createProperty) {
      throw new Error('Failed to create property');
    }
    return data.createProperty;
  }

  async updateProperty(input: UpdatePropertyInput): Promise<Property> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_PROPERTY,
      variables: { input },
    });
    if (!data?.updateProperty) {
      throw new Error('Failed to update property');
    }
    return data.updateProperty;
  }

  async getProperty(propertyId: string): Promise<Property | null> {
    const { data } = await this.client.query({
      query: GET_PROPERTY,
      variables: { propertyId },
    });
    return data?.property || null;
  }

  async getMyProperties(page = 1, limit = 20): Promise<PropertyListPage> {
    const { data } = await this.client.query({
      query: MY_PROPERTIES,
      variables: { page, limit },
      fetchPolicy: 'network-only',
    });
    return data.myProperties;
  }

  async updatePropertyStatus(propertyId: string, status: string): Promise<Property> {
    const { data } = await this.client.mutate({
      mutation: UPDATE_PROPERTY_STATUS,
      variables: { propertyId, status },
    });
    return data.updatePropertyStatus;
  }

  async addPropertyMedia(propertyId: string, media: PropertyMediaInput[]): Promise<GenericResult> {
    const { data } = await this.client.mutate({
      mutation: ADD_PROPERTY_MEDIA,
      variables: { propertyId, media },
    });
    return data.addPropertyMedia;
  }

  async addPropertyFeatures(propertyId: string, features: FeatureInput[]): Promise<GenericResult> {
    const { data } = await this.client.mutate({
      mutation: ADD_PROPERTY_FEATURES,
      variables: { propertyId, features },
    });
    return data.addPropertyFeatures;
  }

  async saveProperty(propertyId: string): Promise<GenericResult> {
    const { data } = await this.client.mutate({
      mutation: SAVE_PROPERTY,
      variables: { propertyId },
    });
    return data.saveProperty;
  }

  async removeSavedProperty(propertyId: string): Promise<GenericResult> {
    const { data } = await this.client.mutate({
      mutation: REMOVE_SAVED_PROPERTY,
      variables: { propertyId },
    });
    return data.removeSavedProperty;
  }

  async createPropertyRating(
    propertyId: string,
    overallRating: number,
    title?: string,
    review?: string,
    isAnonymous?: boolean
  ): Promise<GenericResult> {
    const { data } = await this.client.mutate({
      mutation: CREATE_PROPERTY_RATING,
      variables: { propertyId, overallRating, title, review, isAnonymous },
    });
    return data.createPropertyRating;
  }

  async recordPropertyView(propertyId: string): Promise<GenericResult> {
    const { data } = await this.client.mutate({
      mutation: RECORD_PROPERTY_VIEW,
      variables: { propertyId },
    });
    return data.recordPropertyView;
  }
}

export const getCurrentUserId = (): string => {
  try {
    const user = localStorage.getItem('user') || localStorage.getItem('userInfo');
    if (user) {
      const userData = JSON.parse(user);
      return String(userData.id || '');
    }
    return '';
  } catch {
    return '';
  }
};

export const mapFormDataToPropertyInput = (formData: {
  title: string;
  description: string;
  propertyType: string;
  listingType?: string;
  price: string;
  location: string;
  city?: string;
  state?: string;
  country?: string;
  bedrooms?: string;
  bathrooms?: string;
  builderName?: string;
  projectName?: string;
  reraId?: string;
}): CreatePropertyInput => ({
  title: formData.title || '',
  description: formData.description || '',
  builderName: formData.builderName || '',
  projectName: formData.projectName || '',
  reraId: formData.reraId || '',
  propertyType: formData.propertyType || 'APARTMENT',
  listingType: formData.listingType || 'SALE',
  price: parseFloat(formData.price) || 0,
  currency: 'INR',
  city: formData.city || '',
  state: formData.state || '',
  country: formData.country || 'India',
  location: formData.location || '',
  bedrooms: parseInt(formData.bedrooms || '0', 10) || 0,
  bathrooms: parseInt(formData.bathrooms || '0', 10) || 0,
});
