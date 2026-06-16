export type CuratedIcon = {
  id: string;
  label: string;
  category: CuratedCategory;
  keywords?: string[];
};

export type CuratedCategory =
  | "Property"
  | "Connectivity"
  | "Check-in"
  | "Amenities"
  | "Outdoor"
  | "Transport"
  | "Nearby"
  | "Food"
  | "Rules"
  | "Emergency"
  | "Contact"
  | "People";

export const CURATED_CATEGORIES: CuratedCategory[] = [
  "Property",
  "Connectivity",
  "Check-in",
  "Amenities",
  "Outdoor",
  "Transport",
  "Nearby",
  "Food",
  "Rules",
  "Emergency",
  "Contact",
  "People",
];

// Curated guidebook icons, all from Phosphor (ph) fill style for visual consistency.
// To re-skin, swap the set prefix here (e.g. solar:, tabler:, lucide:) — the picker's
// "All icons" tab still gives hosts access to every Iconify collection.
export const CURATED_ICONS: CuratedIcon[] = [
  { id: "ph:house-fill", label: "Home", category: "Property", keywords: ["house", "property"] },
  { id: "ph:bed-fill", label: "Bedroom", category: "Property", keywords: ["sleep", "room"] },
  { id: "ph:bathtub-fill", label: "Bathroom", category: "Property", keywords: ["shower", "toilet"] },
  { id: "ph:chef-hat-fill", label: "Kitchen", category: "Property", keywords: ["cook", "food"] },
  { id: "ph:armchair-fill", label: "Living Room", category: "Property", keywords: ["lounge", "chair"] },
  { id: "ph:frame-corners-fill", label: "Decor", category: "Property", keywords: ["interior", "frame"] },
  { id: "ph:building-fill", label: "Building", category: "Property", keywords: ["apartment"] },

  { id: "ph:wifi-high-fill", label: "Wi-Fi", category: "Connectivity", keywords: ["internet", "wifi"] },
  { id: "ph:password-fill", label: "Password", category: "Connectivity", keywords: ["wifi password"] },
  { id: "ph:speaker-hifi-fill", label: "Smart Speaker", category: "Connectivity", keywords: ["alexa", "google"] },
  { id: "ph:headphones-fill", label: "Audio", category: "Connectivity", keywords: ["music"] },
  { id: "ph:lightning-fill", label: "Power", category: "Connectivity", keywords: ["electricity"] },

  { id: "ph:key-fill", label: "Key", category: "Check-in", keywords: ["access", "entry"] },
  { id: "ph:lock-key-fill", label: "Lock", category: "Check-in", keywords: ["smart lock"] },
  { id: "ph:door-fill", label: "Door", category: "Check-in", keywords: ["entry"] },
  { id: "ph:calendar-fill", label: "Calendar", category: "Check-in", keywords: ["dates", "booking"] },
  { id: "ph:clock-fill", label: "Time", category: "Check-in", keywords: ["hours", "clock"] },
  { id: "ph:sign-in-fill", label: "Check-in", category: "Check-in" },
  { id: "ph:sign-out-fill", label: "Check-out", category: "Check-in" },

  { id: "ph:television-fill", label: "TV", category: "Amenities", keywords: ["television"] },
  { id: "ph:snowflake-fill", label: "AC", category: "Amenities", keywords: ["cooling", "air"] },
  { id: "ph:fire-fill", label: "Heating", category: "Amenities", keywords: ["heat", "fire"] },
  { id: "ph:washing-machine-fill", label: "Laundry", category: "Amenities", keywords: ["washer"] },
  { id: "ph:coffee-fill", label: "Coffee", category: "Amenities", keywords: ["drink", "cafe"] },
  { id: "ph:lamp-fill", label: "Lighting", category: "Amenities", keywords: ["lamp"] },
  { id: "ph:thermometer-fill", label: "Thermostat", category: "Amenities", keywords: ["temperature"] },
  { id: "ph:wind-fill", label: "Fan", category: "Amenities", keywords: ["air", "breeze"] },
  { id: "ph:cooking-pot-fill", label: "Cooking", category: "Amenities", keywords: ["pot", "kitchen"] },
  { id: "ph:oven-fill", label: "Oven", category: "Amenities", keywords: ["bake"] },

  { id: "ph:swimming-pool-fill", label: "Pool", category: "Outdoor", keywords: ["swimming"] },
  { id: "ph:tree-fill", label: "Garden", category: "Outdoor", keywords: ["yard", "park"] },
  { id: "ph:plant-fill", label: "Plant", category: "Outdoor", keywords: ["greenery"] },
  { id: "ph:flower-fill", label: "Flowers", category: "Outdoor", keywords: ["garden"] },
  { id: "ph:sun-fill", label: "Patio", category: "Outdoor", keywords: ["balcony", "terrace", "sun"] },
  { id: "ph:tent-fill", label: "Camping", category: "Outdoor", keywords: ["camp"] },
  { id: "ph:mountains-fill", label: "Mountains", category: "Outdoor", keywords: ["nature"] },
  { id: "ph:umbrella-simple-fill", label: "Beach", category: "Outdoor", keywords: ["lake", "sea", "umbrella"] },
  { id: "ph:compass-fill", label: "Compass", category: "Outdoor", keywords: ["direction"] },

  { id: "ph:car-fill", label: "Car", category: "Transport", keywords: ["drive", "parking"] },
  { id: "ph:bicycle-fill", label: "Bike", category: "Transport", keywords: ["bicycle"] },
  { id: "ph:motorcycle-fill", label: "Motorcycle", category: "Transport", keywords: ["bike"] },
  { id: "ph:scooter-fill", label: "Scooter", category: "Transport" },
  { id: "ph:bus-fill", label: "Bus", category: "Transport", keywords: ["public transport"] },
  { id: "ph:train-fill", label: "Train", category: "Transport", keywords: ["rail"] },
  { id: "ph:airplane-fill", label: "Airport", category: "Transport", keywords: ["flight", "plane"] },
  { id: "ph:taxi-fill", label: "Taxi", category: "Transport", keywords: ["cab", "uber"] },
  { id: "ph:gas-pump-fill", label: "Gas Station", category: "Transport", keywords: ["fuel"] },
  { id: "ph:boat-fill", label: "Boat", category: "Transport", keywords: ["ferry"] },

  { id: "ph:map-pin-fill", label: "Pin", category: "Nearby", keywords: ["location"] },
  { id: "ph:storefront-fill", label: "Shop", category: "Nearby", keywords: ["store"] },
  { id: "ph:shopping-cart-fill", label: "Groceries", category: "Nearby", keywords: ["supermarket"] },
  { id: "ph:shopping-bag-fill", label: "Shopping", category: "Nearby", keywords: ["mall"] },
  { id: "ph:currency-circle-dollar-fill", label: "ATM", category: "Nearby", keywords: ["bank", "cash"] },
  { id: "ph:pill-fill", label: "Pharmacy", category: "Nearby", keywords: ["drugstore"] },
  { id: "ph:hospital-fill", label: "Hospital", category: "Nearby", keywords: ["medical"] },
  { id: "ph:barbell-fill", label: "Gym", category: "Nearby", keywords: ["fitness"] },
  { id: "ph:medal-fill", label: "Attraction", category: "Nearby", keywords: ["landmark"] },
  { id: "ph:trophy-fill", label: "Trophy", category: "Nearby" },
  { id: "ph:building-office-fill", label: "Museum", category: "Nearby", keywords: ["gallery"] },
  { id: "ph:image-square-fill", label: "Gallery", category: "Nearby", keywords: ["art"] },

  { id: "ph:fork-knife-fill", label: "Restaurant", category: "Food", keywords: ["dining", "eat"] },
  { id: "ph:hamburger-fill", label: "Burger", category: "Food" },
  { id: "ph:pizza-fill", label: "Pizza", category: "Food" },
  { id: "ph:bread-fill", label: "Bakery", category: "Food", keywords: ["pastry"] },
  { id: "ph:cake-fill", label: "Cake", category: "Food", keywords: ["dessert"] },
  { id: "ph:ice-cream-fill", label: "Ice Cream", category: "Food", keywords: ["dessert"] },
  { id: "ph:cookie-fill", label: "Snacks", category: "Food" },
  { id: "ph:beer-bottle-fill", label: "Bar", category: "Food", keywords: ["beer", "drink"] },
  { id: "ph:martini-fill", label: "Cocktails", category: "Food", keywords: ["drink"] },
  { id: "ph:wine-fill", label: "Wine", category: "Food" },
  { id: "ph:champagne-fill", label: "Champagne", category: "Food", keywords: ["celebration"] },

  { id: "ph:cigarette-fill", label: "Smoking", category: "Rules", keywords: ["cigarette"] },
  { id: "ph:cigarette-slash-fill", label: "No Smoking", category: "Rules" },
  { id: "ph:dog-fill", label: "Pets", category: "Rules", keywords: ["animals", "dog"] },
  { id: "ph:speaker-high-fill", label: "Noise", category: "Rules", keywords: ["quiet hours", "sound"] },
  { id: "ph:prohibit-fill", label: "Not Allowed", category: "Rules", keywords: ["forbidden", "no"] },
  { id: "ph:list-checks-fill", label: "House Rules", category: "Rules", keywords: ["list"] },
  { id: "ph:check-circle-fill", label: "Allowed", category: "Rules", keywords: ["yes"] },

  { id: "ph:warning-circle-fill", label: "Warning", category: "Emergency", keywords: ["alert"] },
  { id: "ph:shield-warning-fill", label: "Safety", category: "Emergency" },
  { id: "ph:first-aid-fill", label: "First Aid", category: "Emergency", keywords: ["medical"] },
  { id: "ph:first-aid-kit-fill", label: "Medical Kit", category: "Emergency", keywords: ["health"] },
  { id: "ph:fire-extinguisher-fill", label: "Fire", category: "Emergency", keywords: ["extinguisher"] },
  { id: "ph:bell-fill", label: "Bell", category: "Emergency", keywords: ["alarm"] },
  { id: "ph:bell-ringing-fill", label: "Alarm", category: "Emergency" },
  { id: "ph:siren-fill", label: "Siren", category: "Emergency", keywords: ["alarm"] },

  { id: "ph:phone-fill", label: "Phone", category: "Contact", keywords: ["call"] },
  { id: "ph:envelope-fill", label: "Email", category: "Contact", keywords: ["mail"] },
  { id: "ph:chat-circle-fill", label: "Chat", category: "Contact", keywords: ["message"] },
  { id: "ph:globe-fill", label: "Website", category: "Contact", keywords: ["link", "internet"] },
  { id: "ph:share-network-fill", label: "Share", category: "Contact", keywords: ["link"] },

  { id: "ph:user-fill", label: "Host", category: "People", keywords: ["person"] },
  { id: "ph:users-fill", label: "Guests", category: "People", keywords: ["people"] },
  { id: "ph:baby-fill", label: "Kids", category: "People", keywords: ["child", "family"] },
  { id: "ph:heart-fill", label: "Favorite", category: "People", keywords: ["like", "love"] },
  { id: "ph:star-fill", label: "Star", category: "People", keywords: ["rating"] },
];

export const FALLBACK_CURATED_ID = "ph:info-fill";
