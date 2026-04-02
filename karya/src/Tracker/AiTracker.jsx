import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewMom from './ViewMom.jsx';

const AiTracker = () => {
	return (
		// let SafeAreaView apply the top inset; use edges to ensure top inset is respected
		<SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
			<View style={styles.headerRow}>
				<Text style={styles.title}>Meeting Tracker</Text>
			</View>

			<View style={styles.contentArea}>
				<ViewMom />
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	root: { 
		flex: 1, 
		backgroundColor: '#0f1724'
	},
	headerRow: { 
		paddingHorizontal: 16, 
		paddingVertical: 10,
		alignItems: 'center'
	},
	title: { 
		color: '#E6EEF1', 
		fontSize: 24, 
		fontWeight: '700', 
		textAlign: 'center' 
	},
	navRow: { 
		flexDirection: 'row', 
		backgroundColor: '#1e293b',
		paddingVertical: 8,
		paddingHorizontal: 8
	},
	navButton: { 
		flex: 1,
		paddingVertical: 12, 
		paddingHorizontal: 12, 
		marginHorizontal: 4, 
		borderRadius: 8, 
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'transparent' 
	},
	navButtonActive: { 
		backgroundColor: '#0ea5a4'
	},
	navButtonText: { 
		color: '#cbd5e1', 
		fontWeight: '600',
		fontSize: 15
	},
	navButtonTextActive: { 
		color: 'white' 
	},
	contentArea: { 
		flex: 1,
		backgroundColor: '#fff'
	},
});

export default AiTracker;