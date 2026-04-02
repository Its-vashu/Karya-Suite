import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from './theme/ThemeContext';

const HelpSupportScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'How do I submit a timesheet?',
      answer: 'Go to the Timesheet section from the home screen, select the date, fill in your work hours, and click Submit. Your manager will receive a notification for approval.'
    },
    {
      id: 2,
      question: 'How do I apply for leave?',
      answer: 'Navigate to Leave Management, select the leave type, choose your dates, provide a reason, and submit. You will receive a notification once it is approved or rejected.'
    },
    {
      id: 3,
      question: 'How can I track my expense claims?',
      answer: 'Go to Expenses section and click on "My Claims" to view all your submitted expense claims along with their approval status.'
    },
    {
      id: 4,
      question: 'How do I update my profile?',
      answer: 'Go to My Profile from the menu, then click on User Details to update your personal information, contact details, and emergency contacts.'
    },
    {
      id: 5,
      question: 'How do I give appreciation to a colleague?',
      answer: 'Navigate to Appreciation section, click "Show Appreciation", select the employee, choose a category, write your message, and submit.'
    }
  ];

  const handleEmailPress = () => {
    Linking.openURL('mailto:hr@concientech.com').catch(() => {
      Alert.alert('Error', 'Could not open email app');
    });
  };

  const handlePhonePress = () => {
    Linking.openURL('tel:+918630704264').catch(() => {
      Alert.alert('Error', 'Could not make phone call');
    });
  };

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Contact Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contact Us</Text>
        
        <TouchableOpacity 
          style={[styles.contactCard, { backgroundColor: theme.colors.surface }]}
          onPress={handleEmailPress}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.name === 'dark' ? 'rgba(62, 168, 255, 0.15)' : '#E3F2FD' }]}>
            <MaterialIcons name="email" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactLabel, { color: theme.colors.muted }]}>Email</Text>
            <Text style={[styles.contactValue, { color: theme.colors.text }]}>hr@concientech.com</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.contactCard, { backgroundColor: theme.colors.surface }]}
          onPress={handlePhonePress}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.name === 'dark' ? 'rgba(62, 168, 255, 0.15)' : '#E3F2FD' }]}>
            <MaterialIcons name="phone" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactLabel, { color: theme.colors.muted }]}>Phone</Text>
            <Text style={[styles.contactValue, { color: theme.colors.text }]}>+91 86307 04264</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.muted} />
        </TouchableOpacity>
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <View style={styles.faqHeader}>
          <MaterialIcons name="help-outline" size={24} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginLeft: 8 }]}>FAQ Section</Text>
        </View>
        
        {faqs.map((faq) => (
          <TouchableOpacity
            key={faq.id}
            style={[styles.faqCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => toggleFaq(faq.id)}
            activeOpacity={0.7}
          >
            <View style={styles.faqQuestion}>
              <View style={[styles.faqIconCircle, { backgroundColor: theme.name === 'dark' ? 'rgba(62, 168, 255, 0.1)' : '#F0F4FF' }]}>
                <MaterialIcons name="help-outline" size={20} color={theme.colors.primary} />
              </View>
              <Text style={[styles.questionText, { color: theme.colors.text, flex: 1 }]}>
                {faq.question}
              </Text>
              <MaterialIcons 
                name={expandedFaq === faq.id ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                size={24} 
                color={theme.colors.muted} 
              />
            </View>
            {expandedFaq === faq.id && (
              <View style={[styles.faqAnswer, { borderTopColor: theme.name === 'dark' ? '#2D3748' : '#E5E7EB' }]}>
                <Text style={[styles.answerText, { color: theme.colors.muted }]}>
                  {faq.answer}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Additional Info */}
      <View style={[styles.infoCard, { backgroundColor: theme.name === 'dark' ? 'rgba(62, 168, 255, 0.1)' : '#F0F9FF' }]}>
        <MaterialIcons name="info-outline" size={24} color={theme.colors.primary} />
        <Text style={[styles.infoText, { color: theme.colors.text }]}>
          For urgent issues, please call our support line. We're available Monday to Friday, 9 AM - 6 PM IST.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8
  },
  backButton: {
    padding: 8,
    marginLeft: -8
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 40
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  contactInfo: {
    flex: 1
  },
  contactLabel: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600'
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  faqCard: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden'
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  faqIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
    paddingLeft: 48
  },
  infoCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start'
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20
  }
});

export default HelpSupportScreen;
