import { ApolloClient } from '@apollo/client';
import { CREATE_PROPERTY, GET_PROPERTY, ADD_PROPERTY_MEDIA, PropertyType, PropertyStatus, CreatePropertyInput, Property } from '../graphql/property';

export class PropertyService {
  private client: ApolloClient<any>;

  constructor(client: ApolloClient<any>) {
    this.client = client;
  }

  async createProperty(input: CreatePropertyInput): Promise<Property> {
    try {
      console.log('Creating property with input:', input);
      
      const { data } = await this.client.mutate({
        mutation: CREATE_PROPERTY,
        variables: input,
      });

      console.log('GraphQL response:', data);

      if (!data?.createProperty) {
        throw new Error('Failed to create property - no data returned');
      }

      return data.createProperty;
    } catch (error: any) {
      console.error('Error creating property:', error);
      
      // Handle GraphQL errors
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        const graphQLError = error.graphQLErrors[0];
        throw new Error(graphQLError.message || 'GraphQL error occurred');
      }
      
      // Handle network errors
      if (error.networkError) {
        throw new Error('Network error: ' + error.networkError.message);
      }
      
      throw new Error(error.message || 'Failed to create property');
    }
  }

  async getProperty(propertyId: string): Promise<Property | null> {
    try {
      const { data } = await this.client.query({
        query: GET_PROPERTY,
        variables: { propertyId },
      });

      return data?.property || null;
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  }

  async addPropertyMedia(propertyId: number, media: any[]): Promise<{ success: boolean; message: string }> {
    try {
      const { data } = await this.client.mutate({
        mutation: ADD_PROPERTY_MEDIA,
        variables: { propertyId, media },
      });

      if (!data?.addPropertyMedia) {
        throw new Error('Failed to add property media');
      }

      return data.addPropertyMedia;
    } catch (error) {
      console.error('Error adding property media:', error);
      throw error;
    }
  }
}

// Helper function to get current user ID
export const getCurrentUserId = (): string => {
  try {
    const user = localStorage.getItem('user') || localStorage.getItem('userInfo');
    if (user) {
      const userData = JSON.parse(user);
      return userData.id?.toString() || '';
    }
    return '';
  } catch {
    return '';
  }
};

// Helper function to map form data to GraphQL input
export const mapFormDataToPropertyInput = (formData: any): CreatePropertyInput => {
  const userId = getCurrentUserId();
  
  if (!userId) {
    throw new Error('User not authenticated');
  }
  
  console.log('Mapping form data:', formData);
  
  const input = {
    userId,
    title: formData.title || '',
    description: formData.description || '',
    price: parseFloat(formData.price) || 0,
    location: formData.location || '',
    propertyType: formData.propertyType as PropertyType,
    status: formData.status as PropertyStatus,
    bedrooms: parseInt(formData.bedrooms) || 0,
    bathrooms: parseInt(formData.bathrooms) || 0,
    area: parseFloat(formData.area) || 0,
    yearBuilt: parseInt(formData.yearBuilt) || new Date().getFullYear(),
    images: formData.images || [],
    amenities: formData.amenities || [],
    latitude: parseFloat(formData.latitude) || 0,
    longitude: parseFloat(formData.longitude) || 0,
    address: formData.address || formData.location || '',
    city: formData.city || '',
    state: formData.state || '',
    country: formData.country || 'India',
    zipCode: formData.zipCode || '',
    isActive: true,
  };
  
  console.log('Mapped input:', input);
  return input;
};
