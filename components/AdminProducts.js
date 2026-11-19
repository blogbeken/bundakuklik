import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
  Image,
} from "react-native";
import { supabase } from "../services/supabase";

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  category_id: "",
  image_url: "",
  affiliate_url: "",
};

export default function AdminProducts({ onBack }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    try {
      setLoading(true);
      setErrorMessage("");
      const [productResult, categoryResult] = await Promise.all([
        supabase.from("products").select("*").order("id", { ascending: false }),
        supabase.from("categories").select("*").order("name", { ascending: true }),
      ]);
      if (productResult.error) throw productResult.error;
      if (categoryResult.error) throw categoryResult.error;
      setProducts(productResult.data || []);
      setCategories(categoryResult.data || []);
    } catch (error) {
      console.error("Gagal memuat data admin:", error);
      setErrorMessage(error.message || "Gagal mengambil data dari Supabase.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id || "" });
    setSelectedImage(null);
    setErrorMessage("");
    setNotice("");
    setFormVisible(true);
  }

  function openEditForm(product) {
    setEditingId(product.id);
    setSelectedImage(null);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price == null ? "" : String(product.price),
      category_id: product.category_id || "",
      image_url: product.image_url || "",
      affiliate_url: product.affiliate_url || "",
    });
    setErrorMessage("");
    setNotice("");
    setFormVisible(true);
  }

  async function chooseProductImage() {
    try {
      setErrorMessage("");
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage("Izin akses foto belum diberikan. Aktifkan izin foto untuk aplikasi ini.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        setErrorMessage("Foto tidak dapat dibaca. Silakan pilih foto lain atau coba kembali.");
        return;
      }
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setErrorMessage("Ukuran foto maksimal 5 MB. Silakan pilih foto yang lebih kecil.");
        return;
      }
      setSelectedImage(asset);
    } catch (error) {
      console.error("Gagal memilih foto:", error);
      setErrorMessage(error.message || "Tidak dapat membuka galeri foto.");
    }
  }

  async function uploadProductImage() {
    if (!selectedImage) return form.image_url.trim() || null;

    setUploadingImage(true);
    try {
      const mimeType = selectedImage.mimeType || "image/jpeg";
      const extensionFromMime = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      const extension = (selectedImage.fileName?.split(".").pop() || extensionFromMime)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";
      const filePath = `products/${Date.now()}-${Math.floor(Math.random() * 100000)}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, decode(selectedImage.base64), {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
      return data.publicUrl;
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveProduct() {
    if (!form.name.trim()) {
      setErrorMessage("Nama produk wajib diisi.");
      return;
    }
    if (form.price.trim() && (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)) {
      setErrorMessage("Harga harus berupa angka nol atau lebih.");
      return;
    }
    if (form.affiliate_url.trim() && !/^https?:\/\//i.test(form.affiliate_url.trim())) {
      setErrorMessage("Link Shopee harus diawali http:// atau https://.");
      return;
    }
    try {
      setSaving(true);
      setErrorMessage("");
      const uploadedImageUrl = await uploadProductImage();
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: form.price.trim() ? Number(form.price) : 0,
        category_id: form.category_id || null,
        image_url: uploadedImageUrl,
        affiliate_url: form.affiliate_url.trim() || null,
      };
      const result = editingId
        ? await supabase.from("products").update(payload).eq("id", editingId)
        : await supabase.from("products").insert(payload);
      if (result.error) throw result.error;
      setFormVisible(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      setSelectedImage(null);
      setNotice(editingId ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.");
      await loadAdminData();
    } catch (error) {
      console.error("Gagal menyimpan produk:", error);
      setErrorMessage(error.message || "Produk gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (!deleteId) return;
    try {
      setSaving(true);
      setErrorMessage("");
      const { error } = await supabase.from("products").delete().eq("id", deleteId);
      if (error) throw error;
      setDeleteId(null);
      setNotice("Produk berhasil dihapus.");
      await loadAdminData();
    } catch (error) {
      console.error("Gagal menghapus produk:", error);
      setErrorMessage(error.message || "Produk gagal dihapus.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>Bundaku<Text style={styles.brandAccent}>Klik.</Text></Text>
          <Text style={styles.pageSubtitle}>Administrator · Pengelolaan Produk</Text>
        </View>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Daftar Produk</Text>
            <Text style={styles.subtitle}>{products.length} produk tersimpan</Text>
          </View>
          {!formVisible && (
            <Pressable style={styles.addButton} onPress={openAddForm}>
              <Text style={styles.addButtonText}>＋ Tambah Produk</Text>
            </Pressable>
          )}
        </View>

        {notice ? <Text style={styles.success}>{notice}</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {formVisible && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? "Edit Produk" : "Tambah Produk Baru"}</Text>
            <Text style={styles.label}>Nama Produk *</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(v) => updateField("name", v)} placeholder="Contoh: Blackmores Multivitamins" />

            <Text style={styles.label}>Deskripsi</Text>
            <TextInput style={[styles.input, styles.multiline]} value={form.description} onChangeText={(v) => updateField("description", v)} placeholder="Deskripsi singkat produk" multiline />

            <Text style={styles.label}>Harga (angka saja)</Text>
            <TextInput style={styles.input} value={form.price} onChangeText={(v) => updateField("price", v)} placeholder="Contoh: 150000" keyboardType="numeric" />

            <Text style={styles.label}>Kategori</Text>
            {categories.length ? (
              <View style={styles.categoryChoices}>
                {categories.map((category) => (
                  <Pressable key={category.id} onPress={() => updateField("category_id", category.id)} style={[styles.categoryChoice, form.category_id === category.id && styles.categoryChoiceActive]}>
                    <Text style={[styles.categoryChoiceText, form.category_id === category.id && styles.categoryChoiceTextActive]}>{category.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : <Text style={styles.helper}>Belum ada kategori. Produk dapat disimpan tanpa kategori.</Text>}

            <Text style={styles.label}>Foto Produk</Text>
            <View style={styles.imagePickerRow}>
              <Pressable style={styles.chooseImageButton} onPress={chooseProductImage} disabled={saving}>
                <Text style={styles.chooseImageText}>📷 Pilih Foto dari Perangkat</Text>
              </Pressable>
              {(selectedImage || form.image_url) ? (
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => { setSelectedImage(null); updateField("image_url", ""); }}
                  disabled={saving}
                >
                  <Text style={styles.removeImageText}>Hapus Foto</Text>
                </Pressable>
              ) : null}
            </View>
            {selectedImage?.uri ? (
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} resizeMode="contain" />
            ) : form.image_url ? (
              <Image source={{ uri: form.image_url }} style={styles.previewImage} resizeMode="contain" />
            ) : (
              <Text style={styles.helper}>Belum ada foto. Pilih foto JPG, PNG, atau WebP (maksimal 5 MB).</Text>
            )}
            <Text style={styles.helper}>Foto akan diunggah ke Supabase Storage, bucket product-images.</Text>

            <Text style={styles.label}>Link Shopee Affiliate</Text>
            <TextInput style={styles.input} value={form.affiliate_url} onChangeText={(v) => updateField("affiliate_url", v)} placeholder="https://..." autoCapitalize="none" />

            <View style={styles.formActions}>
              <Pressable style={styles.cancelButton} onPress={() => { setFormVisible(false); setEditingId(null); setErrorMessage(""); }} disabled={saving}>
                <Text style={styles.cancelText}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={saveProduct} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>{uploadingImage ? "Mengunggah Foto..." : "Simpan Produk"}</Text>}
              </Pressable>
            </View>
          </View>
        )}

        {deleteId && (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmText}>Yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.</Text>
            <View style={styles.formActions}>
              <Pressable style={styles.cancelButton} onPress={() => setDeleteId(null)} disabled={saving}><Text style={styles.cancelText}>Batal</Text></Pressable>
              <Pressable style={styles.deleteConfirmButton} onPress={deleteProduct} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Ya, Hapus</Text>}
              </Pressable>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loading}><ActivityIndicator size="large" color="#263B2F" /><Text style={styles.helper}>Memuat data produk...</Text></View>
        ) : products.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>Belum ada produk</Text><Text style={styles.helper}>Tekan “Tambah Produk” untuk memasukkan produk pertama.</Text></View>
        ) : (
          <View style={styles.list}>
            {products.map((product) => (
              <View key={product.id} style={styles.productRow}>
                <View style={styles.thumb}>
                  {product.image_url ? <Image source={{ uri: product.image_url }} style={styles.thumbImage} resizeMode="contain" /> : <Text style={styles.thumbEmoji}>🛍️</Text>}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productMeta}>Rp {Number(product.price || 0).toLocaleString("id-ID")}</Text>
                  <Text style={styles.productDescription} numberOfLines={2}>{product.description || "Tidak ada deskripsi"}</Text>
                </View>
                <View style={styles.rowActions}>
                  <Pressable style={styles.editButton} onPress={() => openEditForm(product)}><Text style={styles.editText}>Edit</Text></Pressable>
                  <Pressable style={styles.deleteButton} onPress={() => setDeleteId(product.id)}><Text style={styles.deleteText}>Hapus</Text></Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
        <Pressable style={styles.refreshButton} onPress={loadAdminData}><Text style={styles.refreshText}>↻ Muat Ulang Daftar</Text></Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F4F6F3" },
  topBar: { backgroundColor: "#FFFFFF", paddingHorizontal: 22, paddingVertical: 17, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E9EDE9" },
  brand: { fontSize: 22, fontWeight: "bold", color: "#263B2F" },
  brandAccent: { color: "#D58B45" },
  pageSubtitle: { color: "#7A857D", fontSize: 11, marginTop: 3 },
  backButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: "#EAF0E9" },
  backButtonText: { color: "#263B2F", fontWeight: "600", fontSize: 12 },
  content: { width: "100%", maxWidth: 1050, alignSelf: "center", padding: 22, paddingBottom: 50 },
  headingRow: { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 12 },
  title: { color: "#263B2F", fontSize: 24, fontWeight: "bold" },
  subtitle: { color: "#7A857D", fontSize: 12, marginTop: 4 },
  addButton: { backgroundColor: "#263B2F", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 9 },
  addButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "bold" },
  success: { color: "#246B3B", backgroundColor: "#E7F4E9", padding: 12, borderRadius: 8, marginBottom: 14 },
  error: { color: "#A52B2B", backgroundColor: "#FCEAEA", padding: 12, borderRadius: 8, marginBottom: 14 },
  formCard: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 13, marginBottom: 20, borderWidth: 1, borderColor: "#E6EAE6" },
  formTitle: { color: "#263B2F", fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  label: { color: "#465349", fontSize: 12, fontWeight: "600", marginTop: 13, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: "#DDE3DD", borderRadius: 8, padding: 12, fontSize: 13, color: "#333333", backgroundColor: "#FFFFFF" },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  categoryChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChoice: { borderWidth: 1, borderColor: "#DDE3DD", borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  categoryChoiceActive: { backgroundColor: "#263B2F", borderColor: "#263B2F" },
  categoryChoiceText: { color: "#536056", fontSize: 12 },
  categoryChoiceTextActive: { color: "#FFFFFF", fontWeight: "bold" },
  helper: { color: "#818B83", fontSize: 12, marginTop: 8 },
  previewImage: { width: 160, height: 150, marginTop: 10, backgroundColor: "#F5F6F5", borderRadius: 8 },
  imagePickerRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  chooseImageButton: { backgroundColor: "#EAF0E9", paddingHorizontal: 14, paddingVertical: 11, borderRadius: 8 },
  chooseImageText: { color: "#263B2F", fontSize: 12, fontWeight: "bold" },
  removeImageButton: { backgroundColor: "#FCECEC", paddingHorizontal: 14, paddingVertical: 11, borderRadius: 8 },
  removeImageText: { color: "#B93838", fontSize: 12, fontWeight: "bold" },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 18 },
  cancelButton: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 8, backgroundColor: "#EEF0EE" },
  cancelText: { color: "#4D574F", fontWeight: "600", fontSize: 12 },
  saveButton: { paddingHorizontal: 19, paddingVertical: 11, borderRadius: 8, backgroundColor: "#263B2F", minWidth: 125, alignItems: "center" },
  saveText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 12 },
  disabled: { opacity: 0.6 },
  confirmCard: { padding: 17, borderRadius: 10, backgroundColor: "#FFF8E9", marginBottom: 18, borderWidth: 1, borderColor: "#F1DDAE" },
  confirmText: { color: "#705522", fontSize: 13, lineHeight: 19 },
  deleteConfirmButton: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 8, backgroundColor: "#B93838", minWidth: 100, alignItems: "center" },
  loading: { alignItems: "center", padding: 40 },
  empty: { backgroundColor: "#FFFFFF", padding: 30, alignItems: "center", borderRadius: 12 },
  emptyTitle: { color: "#263B2F", fontWeight: "bold", fontSize: 16 },
  list: { gap: 10 },
  productRow: { backgroundColor: "#FFFFFF", borderRadius: 11, padding: 12, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E9EDE9" },
  thumb: { width: 66, height: 66, borderRadius: 8, backgroundColor: "#F3F5F3", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbImage: { width: "100%", height: "100%" },
  thumbEmoji: { fontSize: 28 },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { color: "#303B32", fontSize: 13, fontWeight: "bold" },
  productMeta: { color: "#263B2F", fontWeight: "bold", fontSize: 12, marginTop: 4 },
  productDescription: { color: "#858D86", fontSize: 11, marginTop: 4 },
  rowActions: { gap: 7 },
  editButton: { backgroundColor: "#EAF0E9", borderRadius: 7, paddingHorizontal: 13, paddingVertical: 8, alignItems: "center" },
  editText: { color: "#263B2F", fontSize: 11, fontWeight: "bold" },
  deleteButton: { backgroundColor: "#FCECEC", borderRadius: 7, paddingHorizontal: 13, paddingVertical: 8, alignItems: "center" },
  deleteText: { color: "#B93838", fontSize: 11, fontWeight: "bold" },
  refreshButton: { alignSelf: "center", padding: 12, marginTop: 18 },
  refreshText: { color: "#526356", fontWeight: "600", fontSize: 12 },
});
