import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CallButton } from '@/components/CallButton';
import { formatPhoneDisplay, toWhatsAppNumber } from '@/lib/phone';
import {
  deleteProductPayment,
  getFollowUpHistory,
  getProductById,
  getProductPayments,
  rescheduleFollowUp,
  softDeleteProduct,
  type FollowUpEntry,
  type PaymentEntry,
  type ProductDetail,
} from '@/lib/salesQueries';

export default function ProductDetailScreen() {
  const c = Colors[useColorScheme()];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const [item, setItem] = useState<ProductDetail | null>(null);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [history, setHistory] = useState<FollowUpEntry[]>([]);
  const [newFollowUpDate, setNewFollowUpDate] = useState('');
  const [newNote, setNewNote] = useState('');

  const refresh = useCallback(() => {
    if (Number.isNaN(productId)) return;
    getProductById(productId).then((product) => {
      setItem(product);
      setNewFollowUpDate(product?.nextFollowUpDate ?? '');
    });
    getProductPayments(productId).then(setPayments);
    getFollowUpHistory(productId).then(setHistory);
  }, [productId]);

  useFocusEffect(refresh);

  const handleDelete = () => {
    if (!item) return;
    Alert.alert('Delete product sale?', `${item.productName} will be removed from sales.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await softDeleteProduct(productId); router.back(); } },
    ]);
  };

  const handleDeletePayment = (paymentId: number) => {
    Alert.alert('Delete payment?', 'This will remove the payment from history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteProductPayment(paymentId); refresh(); } },
    ]);
  };

  const handleReschedule = async () => {
    await rescheduleFollowUp(productId, newFollowUpDate, newNote || undefined);
    setNewNote('');
    refresh();
  };

  if (!item) return <View style={[styles.container, { backgroundColor: c.background }]} />;

  const paid = item.paid;
  const remaining = Math.max(item.salePrice - paid, 0);
  const reminderText = `Hello ${item.customerName}, reminder for ${item.productName}. Pending amount is ₹${remaining}. Please pay when possible.`;

  const openWhatsAppReminder = () => {
    Linking.openURL(`https://wa.me/${toWhatsAppNumber(item.primaryMobile)}?text=${encodeURIComponent(reminderText)}`);
  };

  const openSmsReminder = () => {
    Linking.openURL(`sms:${item.primaryMobile}?body=${encodeURIComponent(reminderText)}`);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen
        options={{
          title: item.productName,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={() => router.push({ pathname: '/product/form', params: { id: String(productId) } } as unknown as Href)}>
                <Ionicons name="create-outline" size={22} color={c.text} />
              </Pressable>
              <Pressable onPress={handleDelete}>
                <Ionicons name="trash-outline" size={22} color={c.danger} />
              </Pressable>
            </View>
          ),
        }}
      />

      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: c.accentBg }]}>
          <Ionicons name="cube-outline" size={28} color={c.accent} />
        </View>
        <Text style={[styles.name, { color: c.text }]}>{item.productName}</Text>
        <Text style={[styles.meta, { color: c.textSecondary }]}>{item.modelNumber} · {item.serialNumber}</Text>
      </View>

      <View style={[styles.section, { borderTopColor: c.border }]}>
        <View style={styles.primaryRow}>
          <View>
            <Text style={[styles.label, { color: c.textMuted }]}>Customer</Text>
            <Text style={[styles.value, { color: c.text }]}>{item.customerName}</Text>
            <Text style={[styles.meta, { color: c.textSecondary }]}>{formatPhoneDisplay(item.primaryMobile)}</Text>
          </View>
          <CallButton phoneNumber={item.primaryMobile} size="lg" accessibilityLabel={`Call ${item.customerName}`} />
        </View>
        {item.customerAddress ? <Text style={[styles.notes, { color: c.textSecondary }]}>{item.customerAddress}</Text> : null}
      </View>

      <View style={[styles.section, { borderTopColor: c.border }]}>
        <View style={styles.grid}>
          <Info label="Purchase date" value={item.purchaseDate} />
          <Info label="Sale price" value={`₹${item.salePrice}`} />
          <Info label="Total paid" value={`₹${paid}`} />
          <Info label="Remaining" value={`₹${remaining}`} />
          {item.nextFollowUpDate ? <Info label="Next follow-up" value={item.nextFollowUpDate} /> : null}
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/product/payment', params: { id: String(productId) } } as unknown as Href)}
          style={[styles.recordBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}
        >
          <Text style={{ color: c.accent, fontSize: 14, fontWeight: '600' }}>Record payment</Text>
        </Pressable>
      </View>

      {item.productNote ? (
        <View style={[styles.section, { borderTopColor: c.border }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>Product note</Text>
          <Text style={[styles.notes, { color: c.textSecondary }]}>{item.productNote}</Text>
        </View>
      ) : null}

      {item.guarantorName || item.guarantorMobile || item.guarantorAddress || item.guarantorVillage ? (
        <View style={[styles.section, { borderTopColor: c.border }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>Jamin giri / guarantor</Text>
          <View style={styles.primaryRow}>
            <View style={styles.historyText}>
              {item.guarantorName ? <Text style={[styles.value, { color: c.text }]}>{item.guarantorName}</Text> : null}
              {item.guarantorMobile ? (
                <Text style={[styles.meta, { color: c.textSecondary }]}>{formatPhoneDisplay(item.guarantorMobile)}</Text>
              ) : null}
              {item.guarantorVillage ? (
                <Text style={[styles.meta, { color: c.textSecondary }]}>Village: {item.guarantorVillage}</Text>
              ) : null}
              {item.guarantorAddress ? (
                <Text style={[styles.notes, { color: c.textSecondary }]}>{item.guarantorAddress}</Text>
              ) : null}
            </View>
            {item.guarantorMobile ? (
              <CallButton phoneNumber={item.guarantorMobile} size="lg" accessibilityLabel={`Call ${item.guarantorName ?? 'guarantor'}`} />
            ) : null}
          </View>
        </View>
      ) : null}

      {remaining > 0 ? (
        <View style={[styles.section, { borderTopColor: c.border }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>Reminder</Text>
          <View style={styles.actionRow}>
            <Pressable onPress={openWhatsAppReminder} style={[styles.smallBtn, { backgroundColor: c.whatsappBg, borderColor: c.whatsapp }]}>
              <Ionicons name="logo-whatsapp" size={18} color={c.whatsapp} />
              <Text style={{ color: c.whatsapp, fontSize: 13, fontWeight: '700' }}>WhatsApp</Text>
            </Pressable>
            <Pressable onPress={openSmsReminder} style={[styles.smallBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="chatbubble-outline" size={18} color={c.text} />
              <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }}>SMS</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={[styles.section, { borderTopColor: c.border }]}>
        <Text style={[styles.label, { color: c.textMuted }]}>Reschedule follow-up / add note</Text>
        <TextInput
          value={newFollowUpDate}
          onChangeText={setNewFollowUpDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={c.textMuted}
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
        />
        <TextInput
          value={newNote}
          onChangeText={setNewNote}
          placeholder="Note"
          placeholderTextColor={c.textMuted}
          multiline
          style={[styles.input, styles.notesInput, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
        />
        <Pressable onPress={handleReschedule} style={[styles.recordBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}>
          <Text style={{ color: c.accent, fontSize: 14, fontWeight: '600' }}>Save follow-up</Text>
        </Pressable>
      </View>

      <View style={[styles.section, { borderTopColor: c.border }]}>
        <Text style={[styles.label, { color: c.textMuted }]}>Payment history</Text>
        {payments.length === 0 ? (
          <Text style={[styles.notes, { color: c.textSecondary }]}>No payments recorded yet.</Text>
        ) : payments.map((payment) => (
          <View key={payment.id} style={styles.historyRow}>
            <View style={styles.historyText}>
              <Text style={[styles.value, { color: c.text }]}>{payment.dateReceived} · ₹{payment.amountReceived}</Text>
              {payment.notes ? <Text style={[styles.meta, { color: c.textSecondary }]}>{payment.notes}</Text> : null}
            </View>
            <Pressable onPress={() => handleDeletePayment(payment.id)} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={18} color={c.danger} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={[styles.section, { borderTopColor: c.border }]}>
        <Text style={[styles.label, { color: c.textMuted }]}>Follow-up history</Text>
        {history.length === 0 ? (
          <Text style={[styles.notes, { color: c.textSecondary }]}>No follow-up notes yet.</Text>
        ) : history.map((entry) => (
          <View key={entry.id} style={styles.historyRow}>
            <View style={styles.historyText}>
              <Text style={[styles.value, { color: c.text }]}>
                {entry.previousDate || 'No date'} → {entry.newDate || 'No date'}
              </Text>
              {entry.note ? <Text style={[styles.meta, { color: c.textSecondary }]}>{entry.note}</Text> : null}
              <Text style={[styles.meta, { color: c.textMuted }]}>{new Date(entry.createdAt).toLocaleString()}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const c = Colors[useColorScheme()];
  return (
    <View style={styles.gridItem}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 16, marginRight: 4 },
  header: { alignItems: 'center', paddingVertical: 20, gap: 5 },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 13 },
  section: { paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  primaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, marginBottom: 2 },
  value: { fontSize: 15, fontWeight: '600' },
  notes: { fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { minWidth: '40%' },
  recordBtn: { minHeight: 42, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  actionRow: { flexDirection: 'row', gap: 10 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 15 },
  notesInput: { height: 78, textAlignVertical: 'top', paddingTop: 10 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 8 },
  historyText: { flex: 1, gap: 3 },
  iconBtn: { padding: 4 },
});
