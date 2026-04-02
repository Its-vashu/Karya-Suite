// thought.js
const thoughts = [
  "Success is not final, failure is not fatal; it is the courage to continue that counts. - Winston Churchill",
  "The way to get started is to quit talking and begin doing. - Walt Disney",
  "Innovation distinguishes between a leader and a follower. - Steve Jobs",
  "Your limitation—it's only your imagination.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "Little things make big days.",
  "It's going to be hard, but hard does not mean impossible.",
  "Don't wait for opportunity. Create it.",
  "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
  "The key to success is to focus on goals, not obstacles.",
  "Believe you can and you're halfway there. - Theodore Roosevelt",
  "It does not matter how slowly you go as long as you do not stop. - Confucius",
  "Everything you've ever wanted is on the other side of fear. - George Addair",
  "Success is walking from failure to failure with no loss of enthusiasm. - Winston Churchill",
  "The only impossible journey is the one you never begin. - Tony Robbins",
  "In the middle of difficulty lies opportunity. - Albert Einstein",
  "It is during our darkest moments that we must focus to see the light. - Aristotle",
  "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
  "It is never too late to be what you might have been. - George Eliot",
  "A person who never made a mistake never tried anything new. - Albert Einstein",
  "The person who says it cannot be done should not interrupt the person who is doing it. - Chinese Proverb",
  "There are no traffic jams along the extra mile. - Roger Staubach",
  "The only way to do great work is to love what you do. - Steve Jobs",
  "If you can dream it, you can achieve it. - Zig Ziglar",
  "The best time to plant a tree was 20 years ago. The second best time is now. - Chinese Proverb",
  "Your life does not get better by chance, it gets better by change. - Jim Rohn",
  "Success is not how high you have climbed, but how you make a positive difference to the world. - Roy T. Bennett",
  "The only person you are destined to become is the person you decide to be. - Ralph Waldo Emerson",
  "Go confidently in the direction of your dreams. Live the life you have imagined. - Henry David Thoreau",
  "When you have a dream, you've got to grab it and never let go. - Carol Burnett",
  "Life is what happens to you while you're busy making other plans. - John Lennon",
  "The future belongs to those who prepare for it today.",
  "Excellence is not a skill, it's an attitude. - Ralph Marston",
  "You are never too old to set another goal or to dream a new dream. - C.S. Lewis",
  "Success is not just about accomplishment. It's about stepping up, stepping out and making a difference.",
  "The difference between ordinary and extraordinary is that little extra.",
  "Champions keep playing until they get it right. - Billie Jean King",
  "The way to achieve your own success is to be willing to help somebody else get it first. - Iyanla Vanzant",
  "Don't be afraid to give up the good to go for the great. - John D. Rockefeller",
  "The ones who are crazy enough to think they can change the world, are the ones that do. - Anonymous",
  "Don't let yesterday take up too much of today. - Will Rogers",
  "You learn more from failure than from success. Don't let it stop you. Failure builds character.",
  "If you are working on something that you really care about, you don't have to be pushed. The vision pulls you. - Steve Jobs",
  "People who are crazy enough to think they can change the world, are the ones who do. - Rob Siltanen",
  "Failure is the condiment that gives success its flavor. - Truman Capote",
  "The road to success and the road to failure are almost exactly the same. - Colin R. Davis",
  "Success is liking yourself, liking what you do, and liking how you do it. - Maya Angelou",
  "As we work to create light for others, we naturally light our own way. - Mary Anne Radmacher",
  "Success isn't just about what you accomplish in your life. It's about what you inspire others to do.",
  "Try not to become a person of success, but rather try to become a person of value. - Albert Einstein",
  "A successful man is one who can lay a firm foundation with the bricks others have thrown at him. - David Brinkley",
  "No one can make you feel inferior without your consent. - Eleanor Roosevelt",
  "Strive not to be a success, but rather to be of value. - Albert Einstein",
  "Two roads diverged in a wood, and I—I took the one less traveled by, And that has made all the difference. - Robert Frost",
  "I attribute my success to this: I never gave or took any excuse. - Florence Nightingale",
  "You miss 100% of the shots you don't take. - Wayne Gretzky",
  "The most difficult thing is the decision to act, the rest is merely tenacity. - Amelia Earhart",
  "Every strike brings me closer to the next home run. - Babe Ruth",
  "Definiteness of purpose is the starting point of all achievement. - W. Clement Stone",
  "Life isn't about getting and having, it's about giving and being. - Kevin Kruse",
  "We become what we think about most of the time, and that's the strangest secret. - Earl Nightingale",
  "The only thing worse than being blind is having sight but no vision. - Helen Keller",
  "Do what you can with all you have, wherever you are. - Theodore Roosevelt",
  "Develop an 'Attitude of Gratitude'. Say thank you to everyone you meet for everything they do for you.",
  "Don't wish it were easier; wish you were better. - Jim Rohn",
  "The pessimist sees difficulty in every opportunity. The optimist sees opportunity in every difficulty. - Winston Churchill",
  "What lies behind us and what lies before us are tiny matters compared to what lies within us. - Ralph Waldo Emerson",
  "Success is the sum of small efforts repeated day in and day out. - Robert Collier",
  "The only limit to our realization of tomorrow will be our doubts of today. - Franklin D. Roosevelt"
];

// Function to get a random thought
export const getRandomThought = () => {
  const randomIndex = Math.floor(Math.random() * thoughts.length);
  return thoughts[randomIndex];
};

// Function to get thought based on date (for consistent daily thoughts)
export const getDailyThought = (date = new Date()) => {
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  return thoughts[dayOfYear % thoughts.length];
};

// Function to get thoughts in reverse order
export const getThoughtsReverse = () => {
  return [...thoughts].reverse();
};

// Function to get shuffled thoughts
export const getShuffledThoughts = () => {
  const shuffled = [...thoughts];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Function to get thoughts randomly and reversely as requested
export const getRandomAndReverseThoughts = () => {
  const shouldReverse = Math.random() < 0.5; // 50% chance to reverse
  const shuffled = getShuffledThoughts();
  return shouldReverse ? shuffled.reverse() : shuffled;
};

// Export the thoughts array as default
export default thoughts;
