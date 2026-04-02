import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const ThoughtCard = ({
  flipAnim,
  isFlipped,
  serverThought,
  thoughtLoading,
  motivationalQuotes,
  currentQuoteIndex,
  styles
}) => {
  // shimmer animation value (-1 .. 1)
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const skeletonTranslate = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-200, 200],
  });

  return (
    <Animated.View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      transform: [{
        translateX: flipAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [width, 0]
        })
      }]
    }}>
      <LinearGradient
        colors={['#3949AB', '#1E88E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.thoughtGradient}
      >
        {/* Subtle dark overlay to improve contrast over gradient */}
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 16 }} />
        <View style={styles.thoughtHeader}>
          <MaterialIcons name="lightbulb-outline" size={22} color="rgba(255, 255, 255, 0.9)" />
          <Text style={styles.thoughtHeaderText}>Thought of the Day</Text>
        </View>
        <View style={styles.thoughtContent}>
          {thoughtLoading ? (
            // Skeleton shimmer placeholder
            <View style={localStyles.skeletonContainer}>
              <View style={[localStyles.skeletonLine, localStyles.skeletonLarge]}>
                <Animated.View
                  style={[
                    localStyles.shimmer,
                    { transform: [{ translateX: skeletonTranslate }] }
                  ]}
                />
              </View>

              <View style={[localStyles.skeletonLine, localStyles.skeletonSmall]}>
                <Animated.View
                  style={[
                    localStyles.shimmer,
                    { transform: [{ translateX: skeletonTranslate }] }
                  ]}
                />
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.thoughtText, localStyles.improvedQuote]}>
                "{(serverThought && serverThought.quote) ? serverThought.quote : motivationalQuotes[currentQuoteIndex].quote}"
              </Text>
              <Text style={[styles.thoughtAuthor, localStyles.improvedAuthor]}>
                — {(serverThought && serverThought.author) ? serverThought.author : motivationalQuotes[currentQuoteIndex].author}
              </Text>
            </>
          )}
        </View>

        <View style={{ height: 20 }} />

        <View style={styles.quoteDots}>
          {[0, 1].map((idx) => (
            <View
              key={`thought-dot-${idx}`}
              style={[
                styles.quoteDot,
                idx === (isFlipped ? 1 : 0) && styles.activeQuoteDot
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

export default ThoughtCard;

const localStyles = StyleSheet.create({
  skeletonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  skeletonLine: {
    width: '90%',
    height: 18,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginVertical: 8,
  },
  skeletonLarge: {
    height: 80,
  },
  skeletonSmall: {
    width: '50%',
    height: 14,
  },
  shimmer: {
    position: 'absolute',
    left: -200,
    top: 0,
    bottom: 0,
    width: 200,
    backgroundColor: 'rgba(255,255,255,0.12)',
    opacity: 0.6,
  }
  ,
  improvedQuote: {
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 26,
    color: 'rgba(255,255,255,0.98)'
  },
  improvedAuthor: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)'
  }
});
