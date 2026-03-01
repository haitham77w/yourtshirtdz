/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { SiteSettings } from '../types';
import { LOGO_URL } from '../constants';

interface SettingsContextType {
  settings: SiteSettings | null;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .single();

        if (error) throw error;

        if (data) {
          const formattedSettings: SiteSettings = {
            id: data.id,
            siteName: data.site_name,
            siteLogo: data.site_logo || LOGO_URL,
            favicon: data.favicon || LOGO_URL,
            aboutDescriptionAr: data.about_description_ar,
            aboutDescriptionEn: data.about_description_en,
            phoneNumber: data.phone_number,
            aboutLogo: data.about_logo || data.site_logo || LOGO_URL,
            storeLocationUrl: data.store_location_url,
            instagramUrl: data.instagram_url,
            facebookUrl: data.facebook_url,
          };
          setSettings(formattedSettings);

        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
