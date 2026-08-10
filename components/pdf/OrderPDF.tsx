import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Link,
} from '@react-pdf/renderer'
import { formatDate, formatTime, orderRef } from '@/lib/format'
import { BUSINESS, BRAND, TEL_HREF, WHATSAPP_HREF } from '@/lib/business'
import type { Order, Meal } from '@/types'

/**
 * React-PDF can only embed TTF/OTF, so it cannot reuse the site's self-hosted
 * variable woff2 files and fetches Inter over the network at render time
 * instead. That is a live dependency inside a serverless function, which is
 * why `generateOrderPDF` is called defensively — a font host having a bad day
 * must not take an order submission down with it.
 */
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf', fontWeight: 600 },
  ],
})

// React-PDF has no cascade and cannot read a CSS custom property, so the brand
// tokens arrive as literals from lib/business.ts rather than being re-typed.
const { accent: ACCENT, ink: DARK, muted: MUTED, line: LINE, paper: PAPER, surface: SURFACE } = BRAND

const MAPS_URL = BUSINESS.mapsUrl

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 10, color: DARK, backgroundColor: PAPER, paddingVertical: 48, paddingHorizontal: 52 },
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
  mealCard: { backgroundColor: SURFACE, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 16, marginBottom: 14 },
  mealName: { fontSize: 12, fontWeight: 600, color: DARK, marginBottom: 8 },
  mealMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
  metaItem: { minWidth: 80 },
  dishList: { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10, marginTop: 4 },
  dishItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: ACCENT, marginRight: 8 },
  dishName: { fontSize: 9.5, color: DARK },
  footer: { position: 'absolute', bottom: 28, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: LINE, paddingTop: 12 },
  footerText: { fontSize: 8, color: MUTED },
})

interface Props {
  order: Order
  meals: Meal[]
  /** Renders the "not yet submitted" header used by the draft preview. */
  isDraft?: boolean
}

export function OrderPDF({ order, meals, isDraft = false }: Props) {
  const today = formatDate(new Date().toISOString().slice(0, 10))

  return (
    <Document
      title={`${BUSINESS.name} — ${order.event_name}`}
      author={BUSINESS.name}
      subject={isDraft ? 'Draft quote preview' : `Order confirmation #${orderRef(order.id)}`}
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.businessName}>{BUSINESS.name}</Text>
            <Link src={MAPS_URL} style={s.link}>
              <Text>
                {BUSINESS.address.line1}, {BUSINESS.address.line2}{'\n'}
                {BUSINESS.address.city}, {BUSINESS.address.state} {BUSINESS.address.postcode}
              </Text>
            </Link>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
              <Link src={TEL_HREF} style={s.link}><Text>{BUSINESS.phone}</Text></Link>
              <Text style={s.businessDetail}>·</Text>
              <Link src={WHATSAPP_HREF} style={s.link}><Text>WhatsApp</Text></Link>
            </View>
            <Text style={s.businessDetail}>{BUSINESS.email}</Text>
          </View>
          <View>
            {isDraft ? (
              <>
                <Text style={s.draftBadge}>Draft Preview</Text>
                <Text style={s.draftNote}>Not yet submitted</Text>
                <Text style={s.draftNote}>{today}</Text>
              </>
            ) : (
              <>
                <Text style={s.orderRef}>Order Confirmation</Text>
                <Text style={s.orderRef}>#{orderRef(order.id)}</Text>
                <Text style={s.orderRef}>
                  {formatDate(order.created_at.slice(0, 10))}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Client & Event */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Client &amp; Event Details</Text>
          <View style={s.infoGrid}>
            <View style={s.infoBlock}>
              <Text style={s.infoLabel}>Client</Text>
              <Text style={s.infoValue}>{order.client_name}</Text>
              <Text style={[s.infoLabel, { marginTop: 6 }]}>Email</Text>
              <Text style={s.infoValue}>{order.client_email}</Text>
              {!!order.client_phone && (
                <>
                  <Text style={[s.infoLabel, { marginTop: 6 }]}>Phone</Text>
                  <Text style={s.infoValue}>{order.client_phone}</Text>
                </>
              )}
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
          {meals.map(meal => (
            <View key={meal.id} style={s.mealCard} wrap={false}>
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

              {!!meal.dishes?.length && (
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
          <Text style={s.footerText}>
            {BUSINESS.name} · Established {BUSINESS.established}
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : 'Thank you for your order'
            }
          />
        </View>
      </Page>
    </Document>
  )
}
