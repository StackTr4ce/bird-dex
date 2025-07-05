import { useState, useEffect } from 'react';
import ImageCropper from './ImageCropper';
import { supabase } from '../supabaseClient';
import { useAuth } from '../components/AuthProvider';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  CircularProgress,
  TextField,
} from '@mui/material';





interface PhotoUploadProps {
  onUpload?: () => void;
  questId?: string;
  onCancel?: () => void;
}

const PhotoUpload = ({ onUpload, questId, onCancel }: PhotoUploadProps) => {
  const { user } = useAuth();
  // Fetch species for normal uploads (not quest entry)
  const [speciesList, setSpeciesList] = useState<{ id: string; name: string }[]>([]);
  const [speciesId, setSpeciesId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  // For thumbnail generation
  async function createThumbnail(blob: Blob, size = 360): Promise<Blob> {
    // Create an offscreen image and canvas
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = URL.createObjectURL(blob);
    });
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    ctx.drawImage(img, 0, 0, size, size);
    return new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to create thumbnail')), 'image/jpeg', 0.92);
    });
  }
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);


  // Hardcoded species list for My Uploads page
  const HARDCODED_SPECIES = [
    "Abert's Towhee",
    "Acadian Flycatcher",
    "Acorn Woodpecker",
    "Adelaide's Warbler",
    "African Collared-Dove",
    "Agami Heron",
    "Ainley's Storm-Petrel",
    "Alder Flycatcher",
    "Aleutian Tern",
    "Allen's Hummingbird",
    "Alpine Swift",
    "Altamira Oriole",
    "Altamira Yellowthroat",
    "Amazilia Hummingbird",
    "Amazon Kingfisher",
    "American Avocet",
    "American Barn Owl",
    "American Bittern",
    "American Black Duck",
    "American Coot",
    "American Crow",
    "American Dipper",
    "American Flamingo",
    "American Golden-Plover",
    "American Goldfinch",
    "American Goshawk",
    "American Herring Gull",
    "American Kestrel",
    "American Oystercatcher",
    "American Pipit",
    "American Pygmy Kingfisher",
    "American Redstart",
    "American Robin",
    "American Three-toed Woodpecker",
    "American Tree Sparrow",
    "American White Pelican",
    "American Wigeon",
    "American Woodcock",
    "Amethyst-throated Mountain-gem",
    "Amur Stonechat",
    "Ancient Murrelet",
    "Anhinga",
    "Anna's Hummingbird",
    "Antillean Crested Hummingbird",
    "Antillean Nighthawk",
    "Antillean Palm Swift",
    "Antillean Piculet",
    "Antillean Siskin",
    "Antipodean Albatross",
    "Aplomado Falcon",
    "Arctic Loon",
    "Arctic Tern",
    "Arctic Warbler",
    "Arizona Woodpecker",
    "Arrowhead Warbler",
    "Ash-throated Flycatcher",
    "Ashy Storm-Petrel",
    "Ashy-faced Owl",
    "Ashy-throated Chlorospingus",
    "Asian Brown Flycatcher",
    "Asian Rosy-Finch",
    "Atitlan Grebe",
    "Atlantic Puffin",
    "Atlantic Yellow-nosed Albatross",
    "Audouin's Gull",
    "Audubon's Oriole",
    "Aztec Rail",
    "Aztec Thrush",
    "Azure Gallinule",
    "Azure-crowned Hummingbird",
    "Azure-hooded Jay",
    "Azure-rumped Tanager",
    "Bachman's Sparrow",
    "Bachman's Warbler",
    "Bahama Mockingbird",
    "Bahama Nuthatch",
    "Bahama Oriole",
    "Bahama Swallow",
    "Bahama Warbler",
    "Bahama Woodstar",
    "Bahama Yellowthroat",
    "Baikal Teal",
    "Baillon's Crake",
    "Baird's Junco",
    "Baird's Sandpiper",
    "Baird's Sparrow",
    "Baird's Trogon",
    "Bald Eagle",
    "Balsas Screech-Owl",
    "Baltimore Oriole",
    "Bananaquit",
    "Band-backed Wren",
    "Band-rumped Storm-Petrel",
    "Band-rumped Swift",
    "Band-tailed Barbthroat",
    "Band-tailed Pigeon",
    "Banded Quail",
    "Banded Wren",
    "Bank Swallow",
    "Bar-tailed Godwit",
    "Bar-winged Oriole",
    "Barbados Bullfinch",
    "Barbuda Warbler",
    "Bare-crowned Antbird",
    "Bare-faced Ibis",
    "Bare-legged Owl",
    "Bare-necked Umbrellabird",
    "Bare-shanked Screech-Owl",
    "Bare-throated Tiger-Heron",
    "Barn Swallow",
    "Barnacle Goose",
    "Barolo Shearwater",
    "Barred Antshrike",
    "Barred Becard",
    "Barred Forest-Falcon",
    "Barred Hawk",
    "Barred Owl",
    "Barred Parakeet",
    "Barred Puffbird",
    "Barrow's Goldeneye",
    "Bat Falcon",
    "Baudo Guan",
    "Bay Wren",
    "Bay-breasted Cuckoo",
    "Bay-breasted Warbler",
    "Bay-headed Tanager",
    "Bearded Screech-Owl",
    "Bearded Wood-Partridge",
    "Beautiful Hummingbird",
    "Beautiful Treerunner",
    "Bee Hummingbird",
    "Belcher's Gull",
    "Belding's Yellowthroat",
    "Bell's Sparrow",
    "Bell's Vireo",
    "Belted Flycatcher",
    "Belted Kingfisher",
    "Bendire's Thrasher",
    "Bermuda Petrel",
    "Berylline Hummingbird",
    "Bewick's Wren",
    "Bicknell's Thrush",
    "Bicolored Antbird",
    "Bicolored Hawk",
    "Bicolored Wren",
    "Black Antshrike",
    "Black Catbird",
    "Black Francolin",
    "Black Guan",
    "Black Guillemot",
    "Black Hawk-Eagle",
    "Black Kite",
    "Black Noddy",
    "Black Oropendola",
    "Black Oystercatcher",
    "Black Phoebe",
    "Black Rail",
    "Black Rosy-Finch",
    "Black Scoter",
    "Black Skimmer",
    "Black Storm-Petrel",
    "Black Swift",
    "Black Tern",
    "Black Thrush",
    "Black Turnstone",
    "Black Vulture",
    "Black-and-white Becard",
    "Black-and-white Hawk-Eagle",
    "Black-and-white Owl",
    "Black-and-white Warbler",
    "Black-and-yellow Silky-flycatcher",
    "Black-and-yellow Tanager",
    "Black-backed Oriole",
    "Black-backed Woodpecker",
    "Black-banded Woodcreeper",
    "Black-bellied Hummingbird",
    "Black-bellied Plover",
    "Black-bellied Storm-Petrel",
    "Black-bellied Whistling-Duck",
    "Black-bellied Wren",
    "Black-billed Amazon",
    "Black-billed Cuckoo",
    "Black-billed Flycatcher",
    "Black-billed Magpie",
    "Black-billed Nightingale-Thrush",
    "Black-billed Streamertail",
    "Black-breasted Puffbird",
    "Black-breasted Wood-Quail",
    "Black-browed Albatross",
    "Black-capped Chickadee",
    "Black-capped Donacobius",
    "Black-capped Flycatcher",
    "Black-capped Gnatcatcher",
    "Black-capped Petrel",
    "Black-capped Pygmy-Tyrant",
    "Black-capped Siskin",
    "Black-capped Swallow",
    "Black-capped Vireo",
    "Black-cheeked Ant-Tanager",
    "Black-cheeked Warbler",
    "Black-cheeked Woodpecker",
    "Black-chested Jay",
    "Black-chested Sparrow",
    "Black-chinned Hummingbird",
    "Black-chinned Sparrow",
    "Black-collared Hawk",
    "Black-cowled Oriole",
    "Black-crested Coquette",
    "Black-crested Titmouse",
    "Black-crowned Antpitta",
    "Black-crowned Antshrike",
    "Black-crowned Night Heron",
    "Black-crowned Palm-Tanager",
    "Black-crowned Tityra",
    "Black-eared Wood-Quail",
    "Black-faced Antthrush",
    "Black-faced Grassquit",
    "Black-faced Grosbeak",
    "Black-faced Solitaire",
    "Black-faced Tanager",
    "Black-footed Albatross",
    "Black-headed Antthrush",
    "Black-headed Brushfinch",
    "Black-headed Grosbeak",
    "Black-headed Gull",
    "Black-headed Nightingale-Thrush",
    "Black-headed Saltator",
    "Black-headed Siskin",
    "Black-headed Tody-Flycatcher",
    "Black-headed Trogon",
    "Black-hooded Antshrike",
    "Black-legged Kittiwake",
    "Black-necked Stilt",
    "Black-polled Yellowthroat",
    "Black-rumped Waxbill",
    "Black-striped Sparrow",
    "Black-striped Woodcreeper",
    "Black-tailed Flycatcher",
    "Black-tailed Gnatcatcher",
    "Black-tailed Godwit",
    "Black-tailed Gull",
    "Black-tailed Trogon",
    "Black-thighed Grosbeak",
    "Black-throated Blue Warbler",
    "Black-throated Bobwhite",
    "Black-throated Gray Warbler",
    "Black-throated Green Warbler",
    "Black-throated Jay",
    "Black-throated Magpie-Jay",
    "Black-throated Mango",
    "Black-throated Shrike-Tanager",
    "Black-throated Sparrow",
    "Black-throated Wren",
    "Black-tipped Cotinga",
    "Black-vented Oriole",
    "Black-vented Shearwater",
    "Black-whiskered Vireo",
    "Black-winged Stilt",
    "Blackburnian Warbler",
    "Blackpoll Warbler",
    "Blue Bunting",
    "Blue Cotinga",
    "Blue Dacnis",
    "Blue Grosbeak",
    "Blue Ground Dove",
    "Blue Jay",
    "Blue Mockingbird",
    "Blue Mountain Vireo",
    "Blue Rock-Thrush",
    "Blue Seedeater",
    "Blue-and-gold Tanager",
    "Blue-and-white Mockingbird",
    "Blue-and-white Swallow",
    "Blue-and-yellow Macaw",
    "Blue-black Grassquit",
    "Blue-black Grosbeak",
    "Blue-capped Hummingbird",
    "Blue-capped Motmot",
    "Blue-chested Hummingbird",
    "Blue-crowned Chlorophonia",
    "Blue-footed Booby",
    "Blue-fronted Parrotlet",
    "Blue-gray Gnatcatcher",
    "Blue-gray Tanager",
    "Blue-headed Hummingbird",
    "Blue-headed Parrot",
    "Blue-headed Quail-Dove",
    "Blue-headed Vireo",
    "Blue-tailed Hummingbird",
    "Blue-throated Goldentail",
    "Blue-throated Motmot",
    "Blue-throated Mountain-gem",
    "Blue-vented Hummingbird",
    "Blue-winged Teal",
    "Blue-winged Warbler",
    "Bluethroat",
    "Blyth's Reed Warbler",
    "Boat-billed Flycatcher",
    "Boat-billed Heron",
    "Boat-tailed Grackle",
    "Bobolink",
    "Bohemian Waxwing",
    "Bonaparte's Gull",
    "Boreal Chickadee",
    "Boreal Owl",
    "Botteri's Sparrow",
    "Boucard's Wren",
    "Brace's Emerald",
    "Brambling",
    "Bran-colored Flycatcher",
    "Brandt's Cormorant",
    "Brant",
    "Brewer's Blackbird",
    "Brewer's Sparrow",
    "Bridled Quail-Dove",
    "Bridled Sparrow",
    "Bridled Tern",
    "Bridled Titmouse",
    "Bright-rumped Attila",
    "Bristle-thighed Curlew",
    "Broad-billed Hummingbird",
    "Broad-billed Motmot",
    "Broad-billed Sandpiper",
    "Broad-billed Tody",
    "Broad-tailed Hummingbird",
    "Broad-winged Hawk",
    "Bronze Mannikin",
    "Bronze-olive Pygmy-Tyrant",
    "Bronze-tailed Plumeleteer",
    "Bronzed Cowbird",
    "Bronzy Hermit",
    "Brown Booby",
    "Brown Creeper",
    "Brown Jay",
    "Brown Noddy",
    "Brown Pelican",
    "Brown Shrike",
    "Brown Thrasher",
    "Brown Trembler",
    "Brown Violetear",
    "Brown-backed Solitaire",
    "Brown-billed Scythebill",
    "Brown-capped Rosy-Finch",
    "Brown-capped Tyrannulet",
    "Brown-capped Vireo",
    "Brown-chested Martin",
    "Brown-crested Flycatcher",
    "Brown-headed Cowbird",
    "Brown-headed Nuthatch",
    "Brown-hooded Parrot",
    "Brown-throated Parakeet",
    "Brownish Twistwing",
    "Budgerigar",
    "Buff-bellied Hummingbird",
    "Buff-breasted Flycatcher",
    "Buff-breasted Sandpiper",
    "Buff-breasted Wren",
    "Buff-collared Nightjar",
    "Buff-fronted Foliage-gleaner",
    "Buff-fronted Quail-Dove",
    "Buff-rumped Warbler",
    "Buff-throated Saltator",
    "Bufflehead",
    "Buffy Tuftedcheek",
    "Buffy-crowned Wood-Partridge",
    "Buller's Shearwater",
    "Bullock's Oriole",
    "Bulwer's Petrel",
    "Bumblebee Hummingbird",
    "Burrowing Owl",
    "Bushtit",
    "Bushy-crested Jay",
    "Cabanis's Ground-Sparrow",
    "Cabanis's Wren",
    "Cackling Goose",
    "Cactus Wren",
    "California Condor",
    "California Gnatcatcher",
    "California Gull",
    "California Quail",
    "California Scrub-Jay",
    "California Thrasher",
    "California Towhee",
    "Calliope Hummingbird",
    "Canada Goose",
    "Canada Jay",
    "Canada Warbler",
    "Canebrake Wren",
    "Canivet's Emerald",
    "Canvasback",
    "Canyon Towhee",
    "Canyon Wren",
    "Cape May Warbler",
    "Cape Verde Shearwater",
    "Capped Heron",
    "Carib Grackle",
    "Caribbean Dove",
    "Caribbean Elaenia",
    "Caribbean Martin",
    "Carmiol's Tanager",
    "Carolina Chickadee",
    "Carolina Parakeet",
    "Carolina Wren",
    "Caspian Tern",
    "Cassia Crossbill",
    "Cassin's Auklet",
    "Cassin's Finch",
    "Cassin's Kingbird",
    "Cassin's Sparrow",
    "Cassin's Vireo",
    "Cattle Tyrant",
    "Cave Swallow",
    "Cedar Waxwing",
    "Central American Pygmy-Owl",
    "Cerulean Warbler",
    "Chapman's Swift",
    "Charming Hummingbird",
    "Chatham Albatross",
    "Checker-throated Stipplethroat",
    "Chestnut Munia",
    "Chestnut-backed Antbird",
    "Chestnut-backed Chickadee",
    "Chestnut-bellied Cuckoo",
    "Chestnut-bellied Seed-Finch",
    "Chestnut-capped Brushfinch",
    "Chestnut-capped Warbler",
    "Chestnut-collared Longspur",
    "Chestnut-collared Swift",
    "Chestnut-colored Woodpecker",
    "Chestnut-fronted Macaw",
    "Chestnut-headed Oropendola",
    "Chestnut-sided Shrike-Vireo",
    "Chestnut-sided Warbler",
    "Chihuahuan Meadowlark",
    "Chihuahuan Raven",
    "Chimney Swift",
    "Chinese Egret",
    "Chinese Pond-Heron",
    "Chinese Sparrowhawk",
    "Chipping Sparrow",
    "Chiriqui Foliage-gleaner",
    "Chiriqui Quail-Dove",
    "Choco Elaenia",
    "Choco Manakin",
    "Choco Screech-Owl",
    "Choco Sirystes",
    "Choco Tapaculo",
    "Choco Tinamou",
    "Choco Toucan",
    "Christmas Shearwater",
    "Chuck-will's-widow",
    "Chukar",
    "Cinereous Becard",
    "Cinereous Owl",
    "Cinnamon Becard",
    "Cinnamon Hummingbird",
    "Cinnamon Teal",
    "Cinnamon Woodpecker",
    "Cinnamon-bellied Flowerpiercer",
    "Cinnamon-bellied Saltator",
    "Cinnamon-rumped Seedeater",
    "Cinnamon-tailed Sparrow",
    "Citreoline Trogon",
    "Citrine Wagtail",
    "Clapper Rail",
    "Clarion Wren",
    "Clark's Grebe",
    "Clark's Nutcracker",
    "Clay-colored Sparrow",
    "Clay-colored Thrush",
    "Cliff Swallow",
    "Cocoa Thrush",
    "Cocoa Woodcreeper",
    "Cocoi Heron",
    "Cocos Booby",
    "Cocos Cuckoo",
    "Cocos Finch",
    "Cocos Tyrannulet",
    "Coiba Spinetail",
    "Colima Pygmy-Owl",
    "Colima Warbler",
    "Collared Aracari",
    "Collared Forest-Falcon",
    "Collared Plover",
    "Collared Pratincole",
    "Collared Redstart",
    "Collared Towhee",
    "Collared Trogon",
    "Colombian Crake",
    "Comb Duck",
    "Common Black Hawk",
    "Common Chaffinch",
    "Common Chiffchaff",
    "Common Chlorospingus",
    "Common Crane",
    "Common Cuckoo",
    "Common Eider",
    "Common Gallinule",
    "Common Goldeneye",
    "Common Grackle",
    "Common Greenshank",
    "Common Ground Dove",
    "Common Gull",
    "Common Loon",
    "Common Merganser",
    "Common Murre",
    "Common Myna",
    "Common Nighthawk",
    "Common Pauraque",
    "Common Pochard",
    "Common Poorwill",
    "Common Potoo",
    "Common Raven",
    "Common Redshank",
    "Common Redstart",
    "Common Ringed Plover",
    "Common Rosefinch",
    "Common Sandpiper",
    "Common Scoter",
    "Common Shelduck",
    "Common Snipe",
    "Common Swift",
    "Common Tern",
    "Common Tody-Flycatcher",
    "Common Waxbill",
    "Common Wood-Pigeon",
    "Common Yellowthroat",
    "Connecticut Warbler",
    "Cook's Petrel",
    "Cooper's Hawk",
    "Coppery-headed Emerald",
    "Corn Crake",
    "Cory's Shearwater",
    "Costa Rican Brushfinch",
    "Costa Rican Pygmy-Owl",
    "Costa Rican Swift",
    "Costa Rican Warbler",
    "Costa's Hummingbird",
    "Couch's Kingbird",
    "Cozumel Emerald",
    "Cozumel Thrasher",
    "Cozumel Vireo",
    "Cozumel Wren",
    "Crane Hawk",
    "Craveri's Murrelet",
    "Crescent-chested Warbler",
    "Crested Auklet",
    "Crested Bobwhite",
    "Crested Caracara",
    "Crested Eagle",
    "Crested Guan",
    "Crested Myna",
    "Crested Oropendola",
    "Crested Owl",
    "Crested Quail-Dove",
    "Crimson-backed Tanager",
    "Crimson-bellied Woodpecker",
    "Crimson-collared Grosbeak",
    "Crimson-collared Tanager",
    "Crimson-crested Woodpecker",
    "Crimson-fronted Parakeet",
    "Crissal Thrasher",
    "Crowned Slaty Flycatcher",
    "Crowned Woodnymph",
    "Cuban Amazon",
    "Cuban Black Hawk",
    "Cuban Blackbird",
    "Cuban Bullfinch",
    "Cuban Crow",
    "Cuban Emerald",
    "Cuban Gnatcatcher",
    "Cuban Grassquit",
    "Cuban Green Woodpecker",
    "Cuban Kite",
    "Cuban Macaw",
    "Cuban Martin",
    "Cuban Nightjar",
    "Cuban Oriole",
    "Cuban Palm-Crow",
    "Cuban Parakeet",
    "Cuban Pewee",
    "Cuban Pygmy-Owl",
    "Cuban Solitaire",
    "Cuban Tody",
    "Cuban Trogon",
    "Cuban Vireo",
    "Curlew Sandpiper",
    "Curve-billed Thrasher",
    // ... (truncated for brevity, add the full list as needed)
  ];

  useEffect(() => {
    if (!questId) {
      // Use hardcoded species list for My Uploads - use name as id
      setSpeciesList(HARDCODED_SPECIES.map((name) => ({ id: name, name })));
    }
  }, [questId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!croppedBlob) {
      setError('Please select a photo.');
      return;
    }
    if (!questId && !speciesId) {
      setError('Please select a species.');
      return;
    }
    if (croppedBlob.size > 5 * 1024 * 1024) {
      setError('File size must be 5MB or less.');
      return;
    }
    setUploading(true);
    try {
      // Upload full image
      const filePath = `${user?.id}/${questId ? `quest_${questId}` : `species_${speciesId}`}/${Date.now()}_cropped.jpg`;
      const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, croppedBlob);
      if (uploadError) throw uploadError;
      // Generate and upload thumbnail
      const thumbBlob = await createThumbnail(croppedBlob, 360);
      const thumbPath = `${user?.id}/${questId ? `quest_${questId}` : `species_${speciesId}`}/${Date.now()}_thumb.jpg`;
      const { error: thumbError } = await supabase.storage.from('photos').upload(thumbPath, thumbBlob);
      if (thumbError) throw thumbError;
      if (questId) {
        // Store entry in quest_entries table
        await supabase.from('quest_entries').insert({
          user_id: user?.id,
          quest_id: questId,
          image_path: filePath,
          thumbnail_path: thumbPath,
        });
      } else {
        // Check if user already has a photo for this species
        const { data: existingPhotos } = await supabase
          .from('photos')
          .select('id')
          .eq('user_id', user?.id)
          .eq('species_id', speciesId);
        const isFirst = !existingPhotos || existingPhotos.length === 0;
        // Store photo in photos table
        await supabase.from('photos').insert({
          user_id: user?.id,
          species_id: speciesId,
          url: filePath,
          thumbnail_url: thumbPath,
          privacy,
          is_top: isFirst,
        });
      }
      setFile(null);
      setCroppedBlob(null);
      setShowCropper(false);
      setPrivacy('public');
      setSpeciesId('');
      if (onUpload) onUpload();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }
    setUploading(false);
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 1, sm: 2 }, width: '100%', background: 'transparent' }}>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
        <Stack spacing={2}>
          {/* Species selection for normal uploads */}
          {!questId && (
            <FormControl fullWidth required>
              <InputLabel id="species-label">Species</InputLabel>
              <Select
                labelId="species-label"
                value={speciesId}
                label="Species"
                onChange={e => setSpeciesId(e.target.value as string)}
              >
                {speciesList.map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
              <FormHelperText>Select the bird species</FormHelperText>
            </FormControl>
          )}
          <FormControl fullWidth required>
            <Button
              variant="outlined"
              component="label"
              sx={{ width: '100%', justifyContent: 'flex-start', textTransform: 'none' }}
              disabled={uploading}
            >
              {file ? file.name : 'Choose Photo'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  setCroppedBlob(null);
                  if (f) setShowCropper(true);
                }}
                required
              />
            </Button>
            <FormHelperText>Select a photo to upload (max 5MB)</FormHelperText>
          </FormControl>
          {showCropper && file && (
            <Box sx={{ my: 2, mx: 'auto', width: 1, maxWidth: 600 }}>
              <ImageCropper
                file={file}
                onCropped={blob => {
                  setCroppedBlob(blob);
                  setShowCropper(false);
                }}
                onCancel={() => {
                  setShowCropper(false);
                  setFile(null);
                  setCroppedBlob(null);
                }}
              />
            </Box>
          )}
          <FormControl fullWidth>
            <InputLabel id="privacy-label">Privacy</InputLabel>
            <Select
              labelId="privacy-label"
              value={privacy}
              label="Privacy"
              onChange={e => setPrivacy(e.target.value as any)}
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="friends">Friends Only</MenuItem>
              <MenuItem value="private">Private</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button type="submit" variant="contained" color="primary" disabled={uploading} sx={{ minWidth: 120 }}>
              {uploading ? <CircularProgress size={20} /> : 'Upload'}
            </Button>
            {onCancel && (
              <Button onClick={onCancel} disabled={uploading} variant="outlined">Cancel</Button>
            )}
            {error && <FormHelperText error>{error}</FormHelperText>}
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};

export default PhotoUpload;
