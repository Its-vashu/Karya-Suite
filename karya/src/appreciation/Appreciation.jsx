/**
 * Appreciation Module
 * Main navigation component for appreciation features
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ShowAppreciation from './ShowAppreciation';
import NotifyAppreciation from './NotifyAppreciation';
import ViewAllAppreciation from './ViewAllAppreciation';
import AppreciationDashboard from './AppreciationDashboard';
import MyAppreciations from './MyAppreciations';
import AppreciationLikes from './AppreciationLikes';

const AppreciationStack = createStackNavigator();

const Appreciation = () => {
  return (
    <AppreciationStack.Navigator
  initialRouteName="AppreciationDashboard"
      screenOptions={{
        headerShown: false
      }}
    >
      <AppreciationStack.Screen 
        name="AppreciationDashboard" 
        component={AppreciationDashboard} 
      />
      <AppreciationStack.Screen 
        name="NotifyAppreciation" 
        component={NotifyAppreciation} 
      />
      <AppreciationStack.Screen 
        name="ShowAppreciation" 
        component={ShowAppreciation} 
      />
      <AppreciationStack.Screen 
        name="ViewAllAppreciation" 
        component={ViewAllAppreciation} 
      />
      <AppreciationStack.Screen 
        name="MyAppreciations"
        component={MyAppreciations}
      />
      <AppreciationStack.Screen
        name="AppreciationLikes"
        component={AppreciationLikes}
      />
    </AppreciationStack.Navigator>
  );
};

export default Appreciation;
