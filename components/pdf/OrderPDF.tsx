import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Link,
} from '@react-pdf/renderer'
import type { Order, Meal, Dish } from '@/types'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf', fontWeight: 600 },
  ],
})

const ACCENT = '#C8860A'
const DARK = '#1a1a1a'
const MUTED = '#78716c'

const MAPS_URL = 'https://maps.google.com/?q=M+G+Prakash+Catering,+611+10th+Cross+Rd,+Indiranagar+Rajajinagar,+Bengaluru,+Karnataka+560079'

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 10, color: DARK, backgroundColor: '#FAFAF8', paddingVertical: 48, paddingHorizontal: 52 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: ACCENT, marginBottom: 28 },
  businessName: { fontSize: 16, fontWeight: 600, color: DARK, marginBottom: 4 },
  businessDetail: { fontSize: 8.5, color: MUTED, lineHeight: 1.6 },
  link: { fontSize: 8.5, color: MUTED, lineHeight: 1.6, textDecoration: 'none' },
  orderRef: { fontSize: 8.5, color: MUTED, textAlign: 'right', lineHeight: 1.8 },
  draftBadge: { fontSize: 11, fontWeight: 600, color: ACCENT, textAlign: 'right', marginBottom: 4 },
  draftNote: { fontSize: 8, color: MUTED, textAlign: 'right', lineHeight: 1.6 },
  sectionTitle: { fontSize: 8, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  section: { marginBottom: 24 },
  infoGrid: { flexDirection: 'row', gap: 32 },
  infoBlock: { flex: 1 },
  infoLabel: { fontSize: 8, color: MUTED, marginBottom: 2 },
  infoValue: { fontSize: 10, fontWeight: 600, color: DARK },
  mealCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 6, padding: 16, marginBottom: 14 },
  mealName: { fontSize: 12, fontWeight: 600, color: DARK, marginBottom: 8 },
  mealMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
  metaItem: { minWidth: 80 },
  dishList: { borderTopWidth: 1, borderTopColor: '#e7e5e4', paddingTop: 10, marginTop: 4 },
  dishItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: ACCENT, marginRight: 8 },
  dishName: { fontSize: 9.5, color: DARK },
  footer: { position: 'absolute', bottom: 28, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e7e5e4', paddingTop: 12 },
  footerText: { fontSize: 8, color: MUTED },
})

interface Props {
  order: Order
  meals: Meal[]
  dishMap: Record<string, Dish>
  isDraft?: boolean
}

export function OrderPDF({ order, meals, dishMap, isDraft = false }: Props) {
  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.businessName}>M G Prakash Catering</Text>
            <Link src={MAPS_URL} style={s.link}>
              <Text>611, 10th Cross Rd, Indiranagar Rajajinagar{'\n'}Bengaluru, Karnataka 560079</Text>
            </Link>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
              <Link src="tel:+919880193165" style={s.link}><Text>+91 98801 93165</Text></Link>
              <Text style={s.businessDetail}>·</Text>
              <Link src="https://wa.me/919880193165" style={s.link}><Text>WhatsApp</Text></Link>
            </View>
            <Text style={s.businessDetail}>vijaykumar.sb.99@gmail.com</Text>
          </View>
          <View>
            {isDraft ? (
              <>
                <Text style={s.draftBadge}>Draft Preview</Text>
                <Text style={s.draftNote}>Not yet submitted</Text>
                <Text style={s.draftNote}>
                  {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </>
            ) : (
              <>
                <Text style={s.orderRef}>Order Confirmation</Text>
                <Text style={s.orderRef}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={s.orderRef}>
                  {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Client & Event */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Client & Event Details</Text>
          <View style={s.infoGrid}>
            <View style={s.infoBlock}>
              <Text style={s.infoLabel}>Client</Text>
              <Text style={s.infoValue}>{order.client_name}</Text>
              <Text style={[s.infoLabel, { marginTop: 6 }]}>Email</Text>
              <Text style={s.infoValue}>{order.client_email}</Text>
              <Text style={[s.infoLabel, { marginTop: 6 }]}>Phone</Text>
              <Text style={s.infoValue}>{order.client_phone}</Text>
            </View>
            <View style={s.infoBlock}>
              <Text style={s.infoLabel}>Event</Text>
              <Text style={s.infoValue}>{order.event_name}</Text>
              <Text style={[s.infoLabel, { marginTop: 6 }]}>Type</Text>
              <Text style={[s.infoValue, { textTransform: 'capitalize' }]}>{order.event_type}</Text>
            </View>
          </View>
        </View>

        {/* Meals */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Meals ({meals.length})</Text>
          {meals.map((meal, i) => (
            <View key={meal.id} style={s.mealCard}>
              <Text style={s.mealName}>{meal.name}</Text>
              <View style={s.mealMeta}>
                <View style={s.metaItem}>
                  <Text style={s.infoLabel}>Date</Text>
                  <Text style={s.infoValue}>{formatDate(meal.date)}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.infoLabel}>Time</Text>
                  <Text style={s.infoValue}>{formatTime(meal.time)}</Text>
                </View>
                <View style={[s.metaItem, { flex: 2 }]}>
                  <Text style={s.infoLabel}>Location</Text>
                  <Text style={s.infoValue}>{meal.location}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.infoLabel}>Guests</Text>
                  <Text style={s.infoValue}>{meal.total_guests} ({meal.veg_guests} veg)</Text>
                </View>
              </View>

              {meal.dishes && meal.dishes.length > 0 && (
                <View style={s.dishList}>
                  <Text style={[s.sectionTitle, { marginBottom: 6 }]}>
                    Selected Dishes ({meal.dishes.length})
                  </Text>
                  {meal.dishes.map(d => (
                    <View key={d.id} style={s.dishItem}>
                      <View style={s.dot} />
                      <Text style={s.dishName}>{d.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>M G Prakash Catering · Established 2000</Text>
          <Text style={s.footerText}>Thank you for your order</Text>
        </View>
      </Page>
    </Document>
  )
}
