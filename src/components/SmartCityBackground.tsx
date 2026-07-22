/**
 * @deprecated Prefer LandingBackground + backgroundRegistry.
 * Kept so the original smart-city scene can be restored instantly via the City preview.
 */
import React from 'react';
import LandingBackground from './LandingBackground';
import { getBackgroundOption } from '../scene/backgroundRegistry';

const SmartCityBackground: React.FC = () => (
  <LandingBackground option={getBackgroundOption('smart-city')} simSpeed={1} />
);

export default SmartCityBackground;
