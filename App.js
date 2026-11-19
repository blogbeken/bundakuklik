import React, { useState, useEffect } from "react";

import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  Image,
  Linking,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";

import { getProducts, getCategories } from "./services/products";
import { supabase } from "./services/supabase";
import AdminLogin from "./components/AdminLogin";
import AdminProducts from "./components/AdminProducts";
export default function App() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { width } = useWindowDimensions();

  const columns = width > 1000 ? 4 : width > 650 ? 3 : 2;

  // Navigasi sederhana antara beranda, login, dan dashboard admin
  const [currentPage, setCurrentPage] = useState("home");
  const [adminUser, setAdminUser] = useState(null);

  function handleAdminLogin(user) {
    setAdminUser(user);
    setCurrentPage("dashboard");
  }

  async function handleAdminLogout() {
    await supabase.auth.signOut();
    setAdminUser(null);
    setCurrentPage("home");
  }
  // Mengambil data dari Supabase
  async function loadData() {
    try {
      setLoading(true);
      setDbError("");

      const [productData, categoryData] = await Promise.all([
        getProducts(),
        getCategories(),
      ]);

      setProducts(productData);
      setCategories(categoryData);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
      setDbError(error.message || "Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter produk berdasarkan pencarian dan kategori
  const filteredProducts = products.filter((product) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      product.name.toLowerCase().includes(keyword) ||
      (product.description || "").toLowerCase().includes(keyword);

    const matchCategory =
      selectedCategory === "Semua" || product.category_id === selectedCategory;

    return matchSearch && matchCategory;
  });

  // Membuka halaman produk Shopee
  async function openShopee(url) {
    if (!url) {
      Alert.alert("Informasi", "Link produk belum tersedia.");
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Error", "Tidak dapat membuka link produk.");
    }
  }

  // Membuka preview detail produk agar pembeli dapat membaca deskripsi lengkap
  function showDetail(product) {
    setSelectedProduct(product);
  }

  function closeDetail() {
    setSelectedProduct(null);
  }

  async function openShopeeFromDetail() {
    if (!selectedProduct) return;
    const url = selectedProduct.affiliate_url;
    closeDetail();
    await openShopee(url);
  }

  // Halaman login administrator
  if (currentPage === "login") {
    return (
      <AdminLogin
        onBack={() => setCurrentPage("home")}
        onLoginSuccess={handleAdminLogin}
      />
    );
  }

  // Halaman pengelolaan produk
  if (currentPage === "products") {
    return (
      <AdminProducts
        onBack={() => setCurrentPage("dashboard")}
      />
    );
  }

  // Dashboard administrator
  if (currentPage === "dashboard") {
    return (
      <View style={styles.adminDashboard}>
        <Text style={styles.adminDashboardTitle}>Dashboard Admin</Text>
        <Text style={styles.adminDashboardEmail}>
          {adminUser?.email || "Administrator"}
        </Text>
        <Text style={styles.adminDashboardInfo}>
          Selamat datang di pengelolaan Bundaku Klik.
        </Text>
        <Pressable
          style={styles.adminMenuButton}
          onPress={() => setCurrentPage("products")}
        >
          <Text style={styles.adminMenuTitle}>🛍️  Kelola Produk</Text>
          <Text style={styles.adminMenuDescription}>Tambah, edit, dan hapus produk</Text>
        </Pressable>
        <Pressable
          style={styles.adminLogoutButton}
          onPress={handleAdminLogout}
        >
          <Text style={styles.buyButtonText}>Logout</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>
              Bundaku<Text style={styles.logoAccent}>Klik.</Text>
            </Text>
            <Text style={styles.tagline}>Pilihan terbaik untuk keluarga</Text>
          </View>

          <Pressable
            style={styles.adminButton}
            onPress={() => setCurrentPage("login")}
          >
            <Text style={styles.adminText}>Admin</Text>
          </Pressable>
        </View>

        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.heroSmall}>SELAMAT DATANG DI BUNDAKU KLIK</Text>

          <Text style={styles.heroTitle}>
            Temukan Produk{"\n"}Pilihan Keluarga
          </Text>

          <Text style={styles.heroDescription}>
            Berbagai pilihan produk menarik untuk kebutuhan kesehatan, fashion
            dan rumah tangga.
          </Text>

          <Text style={styles.heroEmoji}>🛍️</Text>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk yang Anda inginkan..."
            placeholderTextColor="#999999"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* KATEGORI DARI SUPABASE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategori Produk</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          >
            <Pressable
              onPress={() => setSelectedCategory("Semua")}
              style={[
                styles.categoryButton,
                selectedCategory === "Semua" && styles.categoryActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === "Semua" && styles.categoryTextActive,
                ]}
              >
                Semua
              </Text>
            </Pressable>

            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category.id &&
                      styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* DAFTAR PRODUK */}
        <View style={styles.section}>
          <View style={styles.productHeading}>
            <Text style={styles.sectionTitle}>Produk Pilihan</Text>

            <Text style={styles.productCount}>
              {filteredProducts.length} produk
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#263B2F" />
              <Text style={styles.loadingText}>Memuat produk...</Text>
            </View>
          ) : dbError ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Gagal memuat produk: {dbError}
              </Text>

              <Pressable style={styles.retryButton} onPress={loadData}>
                <Text style={styles.buyButtonText}>Coba Lagi</Text>
              </Pressable>
            </View>
          ) : filteredProducts.length === 0 ? (
            <Text style={styles.emptyText}>
              Belum ada produk yang tersedia.
            </Text>
          ) : (
            <View style={styles.productGrid}>
              {filteredProducts.map((product) => (
                <View
                  key={product.id}
                  style={[
                    styles.productCard,
                    { width: `${100 / columns - 2}%` },
                  ]}
                >
                  <Pressable onPress={() => showDetail(product)}>
                    <View style={styles.productImage}>
                      {product.image_url ? (
                        <Image
                          source={{ uri: product.image_url }}
                          style={styles.image}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.productEmoji}>🛍️</Text>
                      )}
                    </View>

                    <Text style={styles.productCategory}>
                      {categories.find((c) => c.id === product.category_id)
                        ?.name || "Produk"}
                    </Text>

                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>

                    <Text style={styles.productDescription} numberOfLines={3}>
                      {product.description}
                    </Text>

                    {product.price > 0 && (
                      <Text style={styles.productPrice}>
                        Rp {Number(product.price).toLocaleString("id-ID")}
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.buyButton}
                    onPress={() => showDetail(product)}
                  >
                    <Text style={styles.buyButtonText}>Lihat Detail →</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>Bundaku Klik.</Text>

          <Text style={styles.footerText}>
            Temukan produk pilihan untuk keluarga Anda.
          </Text>

          <Text style={styles.copyright}>© 2026 Bundaku Klik</Text>
        </View>
      </ScrollView>

      {/* PREVIEW DETAIL PRODUK: deskripsi ditampilkan penuh sebelum ke Shopee */}
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="slide"
        onRequestClose={closeDetail}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailHeaderTitle}>Detail Produk</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup detail produk"
                style={styles.detailCloseButton}
                onPress={closeDetail}
              >
                <Text style={styles.detailCloseText}>✕</Text>
              </Pressable>
            </View>

            {selectedProduct && (
              <>
                <ScrollView
                  style={styles.detailScroll}
                  contentContainerStyle={styles.detailContent}
                  showsVerticalScrollIndicator={true}
                >
                  <View style={styles.detailImageWrap}>
                    {selectedProduct.image_url ? (
                      <Image
                        source={{ uri: selectedProduct.image_url }}
                        style={styles.detailImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.detailImageEmoji}>🛍️</Text>
                    )}
                  </View>

                  <Text style={styles.detailCategory}>
                    {categories.find((c) => c.id === selectedProduct.category_id)
                      ?.name || "Produk"}
                  </Text>
                  <Text style={styles.detailName}>{selectedProduct.name}</Text>

                  {selectedProduct.price > 0 && (
                    <Text style={styles.detailPrice}>
                      Rp {Number(selectedProduct.price).toLocaleString("id-ID")}
                    </Text>
                  )}

                  <View style={styles.detailDivider} />
                  <Text style={styles.detailDescriptionTitle}>Deskripsi Produk</Text>
                  <Text selectable style={styles.detailDescription}>
                    {selectedProduct.description?.trim() ||
                      "Deskripsi produk belum tersedia."}
                  </Text>
                  <Text style={styles.detailHint}>
                    Silakan baca informasi produk di atas. Jika ingin melihat pilihan,
                    variasi, atau melakukan pembelian, lanjutkan ke halaman Shopee.
                  </Text>
                </ScrollView>

                <View style={styles.detailActions}>
                  <Pressable
                    style={styles.detailBackButton}
                    onPress={closeDetail}
                  >
                    <Text style={styles.detailBackText}>Kembali</Text>
                  </Pressable>
                  <Pressable
                    style={styles.detailShopeeButton}
                    onPress={openShopeeFromDetail}
                  >
                    <Text style={styles.detailShopeeText}>Lihat di Shopee →</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  adminDashboard: {
    flex: 1,
    backgroundColor: "#F4F6F3",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  adminDashboardTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#263B2F",
    textAlign: "center",
  },
  adminDashboardEmail: {
    fontSize: 14,
    color: "#647267",
    marginTop: 12,
  },
  adminMenuButton: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E8E1",
    borderRadius: 13,
    padding: 20,
    marginTop: 28,
  },
  adminMenuTitle: {
    color: "#263B2F",
    fontSize: 17,
    fontWeight: "bold",
  },
  adminMenuDescription: {
    color: "#777777",
    fontSize: 12,
    marginTop: 7,
  },
  adminDashboardInfo: {
    fontSize: 13,
    color: "#777777",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },
  adminLogoutButton: {
    backgroundColor: "#263B2F",
    paddingHorizontal: 30,
    paddingVertical: 13,
    borderRadius: 9,
    marginTop: 25,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#263B2F",
  },

  logoAccent: {
    color: "#D58B45",
  },

  tagline: {
    fontSize: 11,
    color: "#777777",
    marginTop: 3,
  },

  adminButton: {
    backgroundColor: "#263B2F",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9,
  },

  adminText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  hero: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 30,
    borderRadius: 18,
    backgroundColor: "#EAF0E9",
    position: "relative",
    overflow: "hidden",
  },

  heroSmall: {
    color: "#63806A",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  heroTitle: {
    color: "#263B2F",
    fontSize: 29,
    fontWeight: "bold",
    marginTop: 12,
    lineHeight: 36,
  },

  heroDescription: {
    color: "#647267",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 380,
  },

  heroEmoji: {
    fontSize: 55,
    position: "absolute",
    right: 20,
    bottom: 20,
  },

  searchContainer: {
    marginHorizontal: 20,
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    height: 49,
  },

  searchIcon: {
    fontSize: 26,
    color: "#777777",
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#333333",
    outlineStyle: "none",
  },

  section: {
    marginTop: 28,
    marginHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#263B2F",
  },

  categoryList: {
    gap: 9,
    paddingVertical: 15,
  },

  categoryButton: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "#F2F2F2",
  },

  categoryActive: {
    backgroundColor: "#263B2F",
  },

  categoryText: {
    color: "#555555",
    fontSize: 12,
  },

  categoryTextActive: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  productHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 17,
  },

  productCount: {
    fontSize: 12,
    color: "#888888",
  },

  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: "2%",
  },

  productCard: {
    marginBottom: 20,
    padding: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
  },

  productImage: {
    height: 150,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  productEmoji: {
    fontSize: 65,
  },

  productCategory: {
    color: "#9A805E",
    fontSize: 10,
    marginTop: 12,
  },

  productName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333333",
    marginTop: 5,
  },

  productDescription: {
    fontSize: 11,
    color: "#888888",
    lineHeight: 17,
    marginTop: 6,
    minHeight: 45,
  },

  productPrice: {
    color: "#263B2F",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 8,
  },

  buyButton: {
    backgroundColor: "#263B2F",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },

  buyButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },

  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  detailSheet: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  detailHeader: {
    minHeight: 58,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailHeaderTitle: {
    color: "#263B2F",
    fontSize: 16,
    fontWeight: "bold",
  },
  detailCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F3F1",
    alignItems: "center",
    justifyContent: "center",
  },
  detailCloseText: {
    color: "#263B2F",
    fontSize: 17,
    fontWeight: "bold",
  },
  detailScroll: {
    flexGrow: 0,
  },
  detailContent: {
    padding: 20,
    paddingBottom: 28,
  },
  detailImageWrap: {
    width: "100%",
    height: 230,
    borderRadius: 14,
    backgroundColor: "#F7F8F6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  detailImage: {
    width: "100%",
    height: "100%",
  },
  detailImageEmoji: {
    fontSize: 76,
  },
  detailCategory: {
    color: "#9A805E",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 18,
  },
  detailName: {
    color: "#263B2F",
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "bold",
    marginTop: 6,
  },
  detailPrice: {
    color: "#B56B2A",
    fontSize: 19,
    fontWeight: "bold",
    marginTop: 9,
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#E9ECE8",
    marginTop: 20,
    marginBottom: 17,
  },
  detailDescriptionTitle: {
    color: "#263B2F",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  detailDescription: {
    color: "#4F5751",
    fontSize: 14,
    lineHeight: 23,
    flexShrink: 1,
  },
  detailHint: {
    color: "#858B86",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 18,
  },
  detailActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
  },
  detailBackButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#D9E0D9",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailBackText: {
    color: "#263B2F",
    fontSize: 13,
    fontWeight: "bold",
  },
  detailShopeeButton: {
    flex: 1.5,
    minHeight: 46,
    backgroundColor: "#263B2F",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailShopeeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },

  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#777777",
  },

  emptyContainer: {
    alignItems: "center",
    padding: 25,
  },

  emptyText: {
    textAlign: "center",
    color: "#888888",
    padding: 25,
  },

  retryButton: {
    backgroundColor: "#263B2F",
    padding: 12,
    borderRadius: 8,
  },

  footer: {
    backgroundColor: "#263B2F",
    padding: 28,
    marginTop: 30,
    alignItems: "center",
  },

  footerLogo: {
    fontSize: 21,
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  footerText: {
    fontSize: 12,
    color: "#D6DDD7",
    marginTop: 8,
  },

  copyright: {
    fontSize: 10,
    color: "#AEB9B0",
    marginTop: 20,
  },
});
