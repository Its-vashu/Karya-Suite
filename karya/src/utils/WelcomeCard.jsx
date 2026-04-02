import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const WelcomeCard = ({ isFlipped, flipAnim, welcomeCardFront, welcomeCardBack, flipToNextQuote }) => {
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };
  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  return (
    <TouchableOpacity onPress={flipToNextQuote} activeOpacity={0.9}>
      <View style={styles.thoughtCardContainer}>
        <Animated.View style={[styles.thoughtCard, frontAnimatedStyle]}>
          {welcomeCardFront}
        </Animated.View>
        <Animated.View style={[styles.thoughtCard, styles.thoughtCardBack, backAnimatedStyle]}>
          {welcomeCardBack}
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  thoughtCardContainer: {
    marginBottom: 16,
    height: 220,
    perspective: 1000,
  },
  thoughtCard: {
    flex: 1,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backfaceVisibility: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  thoughtCardBack: {
    // position: 'absolute',
  },
});

export default React.memo(WelcomeCard);
