import React from 'react';
import FriendsPage from '../components/FriendsPage';
import { SocialProvider } from '../context/SocialContext';

const Friends = () => (
	<SocialProvider>
		<FriendsPage />
	</SocialProvider>
);

export default Friends;
