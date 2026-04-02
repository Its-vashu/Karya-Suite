import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const MyClaims = ({
  claims,
  statusFilter,
  setStatusFilter,
  getFilteredClaims,
  getStatusCounts,
  normalizeStatus,
  getStatusColor,
  getStatusIcon,
  formatCurrency,
  formatDate,
  onSelectClaim,
  setActiveView,
  onRefresh,
  refreshing,
  styles,
  theme
}) => {
  return (
    <View style={styles.claimsContainer}>
      {/* Summary Stats - Now Clickable for Filtering */}
      {/* Make the stats horizontally scrollable so cards never get clipped on narrow screens */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8 }}
      >
        <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={[
            styles.statCard,
            { backgroundColor: theme?.colors?.surface || 'white' },
            statusFilter === 'all' && styles.activeStatCard
          ]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[
            styles.statNumber,
            statusFilter === 'all' && styles.activeStatNumber
          ]}>
            {getStatusCounts().all}
          </Text>
          <Text style={[
            styles.statLabel,
            statusFilter === 'all' && styles.activeStatLabel
          ]}>
            Total Claims
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.statCard,
            { backgroundColor: theme?.colors?.surface || 'white' }, 
            statusFilter === 'pending' && styles.activeStatCard
          ]}
          onPress={() => setStatusFilter('pending')}
        >
          <Text style={[
            styles.statNumber,
            statusFilter === 'pending' && styles.activeStatNumber
          ]}>
            {getStatusCounts().pending}
          </Text>
          <Text style={[
            styles.statLabel,
            statusFilter === 'pending' && styles.activeStatLabel
          ]}>
            Pending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.statCard,
            { backgroundColor: theme?.colors?.surface || 'white' }, 
            statusFilter === 'approved' && styles.activeStatCard
          ]}
          onPress={() => setStatusFilter('approved')}
        >
          <Text style={[
            styles.statNumber,
            statusFilter === 'approved' && styles.activeStatNumber
          ]}>
            {getStatusCounts().approved}
          </Text>
          <Text style={[
            styles.statLabel,
            statusFilter === 'approved' && styles.activeStatLabel
          ]}>
            Approved
          </Text>
        </TouchableOpacity>

        {getStatusCounts().rejected > 0 && (
          <TouchableOpacity 
            style={[
              styles.statCard,
              { backgroundColor: theme?.colors?.surface || 'white' }, 
              statusFilter === 'rejected' && styles.activeStatCard
            ]}
            onPress={() => setStatusFilter('rejected')}
          >
            <Text style={[
              styles.statNumber,
              statusFilter === 'rejected' && styles.activeStatNumber
            ]}>
              {getStatusCounts().rejected}
            </Text>
            <Text style={[
              styles.statLabel,
              statusFilter === 'rejected' && styles.activeStatLabel
            ]}>
              Rejected
            </Text>
          </TouchableOpacity>
        )}
        </View>
      </ScrollView>

      {/* Rejected card is rendered inline inside the stats row (if present) */}

      {/* Filter Status Indicator */}
      {statusFilter !== 'all' && (
        <View style={[styles.filterIndicator, { backgroundColor: theme?.name === 'dark' ? '#1A2332' : '#E3F2FD' }]}>
          <Text style={[styles.filterText, { color: theme?.colors?.primary || '#1976D2' }]}>
            Showing: {statusFilter.toUpperCase()} ({getFilteredClaims().length})
          </Text>
          <TouchableOpacity 
            onPress={() => setStatusFilter('all')}
            style={styles.clearFilterButton}
          >
            <Text style={styles.clearFilterText}>Show All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Claims List */}
      {getFilteredClaims().length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme?.colors?.surface || 'white' }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme?.name === 'dark' ? '#1A2332' : '#F1F5F9' }]}>
            <MaterialIcons name="receipt-long" size={64} color="#CBD5E1" />
          </View>
          <Text style={[styles.emptyTitle, { color: theme?.colors?.text || '#0F172A' }]}>
            {statusFilter === 'all' ? 'No Expense Claims Yet' : `No ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Claims`}
          </Text>
          <Text style={[styles.emptyDescription, { color: theme?.colors?.muted || '#64748B' }]}>
            {statusFilter === 'all' 
              ? 'Start tracking your expenses by creating your first claim. Get reimbursed faster!'
              : `You don't have any ${statusFilter} expense claims at the moment.`
            }
          </Text>
          {statusFilter === 'all' && (
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setActiveView('new-claim')}
            >
              <MaterialIcons name="add-circle-outline" size={22} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.emptyButtonText}>Create New Claim</Text>
            </TouchableOpacity>
          )}
          {statusFilter !== 'all' && (
            <TouchableOpacity 
              style={[styles.emptyButton, { backgroundColor: '#64748B' }]}
              onPress={() => setStatusFilter('all')}
            >
              <MaterialIcons name="view-list" size={22} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.emptyButtonText}>View All Claims</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.claimsList}>
          {getFilteredClaims().map((claim) => (
            <TouchableOpacity 
              key={claim.id} 
              style={[styles.corporateCard, { backgroundColor: theme?.colors?.surface || 'white' }]}
              onPress={() => onSelectClaim(claim)}
              activeOpacity={0.95}
            >
              <View style={[styles.corporateCardHeader, { backgroundColor: theme?.name === 'dark' ? '#0E1A2B' : '#FAFBFC', borderBottomColor: theme?.name === 'dark' ? '#1A2332' : '#E5E7EB' }]}>
                <View style={styles.headerLeft}>
                  <View style={styles.claimIdContainer}>
                    <MaterialIcons name="receipt-long" size={16} color="#1976D2" />
                    <View style={[styles.headerTextContainer, { marginLeft: 8 }]}>
                      {/* Small uppercase label */}
                      <Text style={[styles.headerLabel, { fontSize: 11, marginBottom: 6, textTransform: 'uppercase' }]}>Claim ID</Text>

                      {/* Monospace badge for the numeric id */}
                      <View style={{ backgroundColor: '#E8F5FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>
                        <Text style={{ fontFamily: 'monospace', fontWeight: '700', color: '#0B79D0' }}>{String(claim?.claim_number ?? claim?.id ?? claim?.claim_no ?? '')}</Text>
                      </View>
                    </View>
                  </View>
                  
                </View>
                <View style={[
                  styles.corporateStatusBadge, 
                  { backgroundColor: getStatusColor(normalizeStatus(claim.status)) }
                ]}>
                  <MaterialIcons 
                    name={getStatusIcon(normalizeStatus(claim.status))} 
                    size={12} 
                    color="white" 
                  />
                  <Text style={styles.corporateStatusText}>
                    {normalizeStatus(claim.status)?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.corporateCardBody}>
                <View style={styles.compactTitleSection}>
                  <View style={styles.titleRow}>
                    <MaterialIcons name="description" size={18} color="#1976D2" style={{ marginRight: 8 }} />
                    <Text style={[styles.compactTitle, { color: theme?.colors?.text || '#0F172A' }]} numberOfLines={2}>{claim.title}</Text>
                  </View>
                  {claim.description && (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 }}>
                      <MaterialIcons name="info-outline" size={14} color="#94A3B8" style={{ marginRight: 6, marginTop: 2 }} />
                      <Text style={styles.compactDescription} numberOfLines={2}>
                        {claim.description}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.compactInfoRow}>
                  <View style={styles.compactAmountBox}>
                    <MaterialIcons name="account-balance-wallet" size={20} color="#10B981" style={{ marginRight: 10 }} />
                    <View style={styles.amountInfo}>
                      <Text style={styles.compactAmountLabel}>TOTAL AMOUNT</Text>
                      <Text style={styles.compactAmountValue}>
                        {formatCurrency(claim.total_amount)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.compactTimeline}>
                    <View style={styles.compactTimelineItem}>
                      <MaterialIcons name="event" size={15} color="#64748B" style={{ marginRight: 5 }} />
                      <View>
                        <Text style={styles.compactTimelineLabel}>Claim Date</Text>
                        <Text style={styles.compactTimelineText}>
                          {formatDate(claim.claim_date)}
                        </Text>
                      </View>
                    </View>
                    {claim.submission_date && (
                      <View style={[styles.compactTimelineItem, { marginTop: 8 }]}>
                        <MaterialIcons name="send" size={15} color="#64748B" style={{ marginRight: 5 }} />
                        <View>
                          <Text style={styles.compactTimelineLabel}>Submitted</Text>
                          <Text style={styles.compactTimelineText}>
                            {formatDate(claim.submission_date)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={[styles.corporateCardFooter, { backgroundColor: theme?.name === 'dark' ? '#0E1A2B' : '#F8F9FA', borderTopColor: theme?.name === 'dark' ? '#1A2332' : '#E9ECEF' }]}>
                {/* align actions to the right so the View Details button appears on the right */}
                <View style={[styles.footerActions, { justifyContent: 'flex-end' }]}>
                  <TouchableOpacity 
                    style={styles.corporateReviewButton}
                    onPress={() => onSelectClaim(claim)}
                  >
                    <MaterialIcons name="visibility" size={16} color="#1976D2" />
                    <Text style={styles.corporateReviewText}>View Details</Text>
                  </TouchableOpacity>
                  {/* date/time removed per design request */}
                </View>
              </View>

              {/* rejection_reason is shown in the Claim Details modal; hide it from the list for a cleaner view */}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default MyClaims;
