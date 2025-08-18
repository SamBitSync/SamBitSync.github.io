// Initialize map with wide view of Nepal for cinematic zoom-in
const map = L.map('map').setView([28.1, 84.1], 7);

// Add ESRI World Imagery satellite tile layer for better terrain visualization
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
}).addTo(map);

// Global variables to store boundary polygons
let nepalPolygon = null;
let bagmatiPolygon = null;
let nagarjunPolygon = null;

// Marker reference storage for highlighting
let markerReferences = {
    houses: [],
    khajaghar: [],
    school: null,
    streetInterviews: [],
    areas: []
};

// Async function to load official Nepal government boundaries including disputed territories
async function loadGeographicBoundaries() {
    console.log('Starting to load official Nepal government boundaries...');
    
    try {
        // Load Nepal country boundary including Kalapani, Lipulekh, and Limpiyadhura territories (2020 update)
        console.log('Loading official Nepal boundary with disputed territories...');
        const nepalResponse = await fetch('https://raw.githubusercontent.com/Acesmndr/nepal-geojson/master/generated-geojson/nepal-with-provinces-acesmndr.geojson');
        
        if (!nepalResponse.ok) {
            console.warn('Primary official source failed, trying alternative...');
            // Fallback to alternative official boundary source
            const fallbackResponse = await fetch('https://raw.githubusercontent.com/din751/nepal_boundary/main/nepal.geojson');
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                await loadNepalBoundaryData(fallbackData, 'fallback official source');
                return;
            }
            throw new Error(`Nepal official data fetch failed: ${nepalResponse.status}`);
        }
        
        const nepalData = await nepalResponse.json();
        await loadNepalBoundaryData(nepalData, 'primary official source');
        
    } catch (error) {
        console.warn('Error loading official geographic boundaries:', error);
        console.log('Attempting to load from government-verified sources...');
        await loadGovernmentVerifiedBoundaries();
    }
}

// Function to process Nepal boundary data from official sources
async function loadNepalBoundaryData(nepalData, source) {
    console.log(`Nepal boundary data loaded from ${source}, features count:`, nepalData.features?.length);
    
    // Verify if this includes the 2020 updates (Kalapani region)
    const hasDisputedTerritories = await verifyDisputedTerritories(nepalData);
    console.log('Disputed territories (Kalapani, Lipulekh, Limpiyadhura) included:', hasDisputedTerritories);
    
    // Create Nepal boundary (country or combined provinces)
    nepalPolygon = L.geoJSON(nepalData, {
        style: {
            color: '#34d399',
            weight: 3,
            opacity: 0.8,
            fillColor: '#34d399',
            fillOpacity: 0.1
        }
    }).addTo(map);
    console.log('Official Nepal boundary added to map successfully');

    // Extract Bagmati Province if available
    await loadProvinceFromData(nepalData);
    
    // Load municipalities from separate official source
    await loadOfficialMunicipalityBoundaries();
}

// Verify if boundary data includes the disputed territories added in 2020
async function verifyDisputedTerritories(geoJsonData) {
    try {
        // Check for coordinates in the Kalapani region (approximately 30.2°N, 80.8°E)
        const features = geoJsonData.features || [geoJsonData];
        
        for (const feature of features) {
            if (feature.geometry && feature.geometry.coordinates) {
                const coords = JSON.stringify(feature.geometry.coordinates);
                // Look for coordinates that would indicate inclusion of western disputed areas
                if (coords.includes('80.8') || coords.includes('80.9')) {
                    return true;
                }
            }
        }
        return false;
    } catch (error) {
        console.warn('Error verifying disputed territories:', error);
        return false;
    }
}

// Load from government-verified community sources as fallback
async function loadGovernmentVerifiedBoundaries() {
    try {
        console.log('Loading from government-verified community sources...');
        
        // Try Open Knowledge Nepal which uses government data
        const oknpResponse = await fetch('https://localboundries.oknp.org/data/country.geojson');
        if (oknpResponse.ok) {
            const oknpData = await oknpResponse.json();
            await loadNepalBoundaryData(oknpData, 'Open Knowledge Nepal (government-verified)');
            return;
        }
        
        // Final fallback to mesaugat repository with note about limitations
        console.warn('Using community-maintained boundaries - may not include complete disputed territories');
        const communityResponse = await fetch('https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-states.geojson');
        if (communityResponse.ok) {
            const communityData = await communityResponse.json();
            await loadNepalBoundaryData(communityData, 'community-maintained (limitations noted)');
            return;
        }
        
        throw new Error('All official and verified boundary sources failed');
        
    } catch (error) {
        console.warn('All official boundary sources failed:', error);
        console.log('Falling back to simplified boundaries with disclaimer...');
        loadFallbackBoundaries();
    }
}

// Extract province boundaries from combined data
async function loadProvinceFromData(nepalData) {
    console.log('Extracting Bagmati Province from official data...');
    
    // Look for Bagmati Province in the features
    const bagmatiFeature = nepalData.features?.find(feature => {
        const props = feature.properties || {};
        const name = props.ADM1_EN || props.PROVINCE || props.NAME || '';
        return name.toLowerCase().includes('bagmati') || name === '3' || name === 'Province 3';
    });
    
    if (bagmatiFeature) {
        console.log('Bagmati Province found in official data:', bagmatiFeature.properties);
        bagmatiPolygon = L.geoJSON(bagmatiFeature, {
            style: {
                color: '#60a5fa',
                weight: 3,
                opacity: 0,
                fillColor: '#60a5fa',
                fillOpacity: 0
            }
        }).addTo(map);
        console.log('Bagmati Province boundary added from official data');
    } else {
        console.warn('Bagmati Province not found in official data, loading from districts...');
        await loadDistrictBoundaries();
    }
}

// Load municipalities from official sources
async function loadOfficialMunicipalityBoundaries() {
    try {
        console.log('Loading official municipality boundaries...');
        
        // Try official/verified municipality data
        const sources = [
            'https://raw.githubusercontent.com/Acesmndr/nepal-geojson/master/generated-geojson/municipalities.geojson',
            'https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-municipalities.geojson'
        ];
        
        for (const source of sources) {
            try {
                const response = await fetch(source);
                if (response.ok) {
                    const data = await response.json();
                    await findNagarjunInData(data, source);
                    return;
                }
            } catch (err) {
                console.warn(`Failed to load from ${source}:`, err);
            }
        }
        
        console.warn('No municipality data sources available');
    } catch (error) {
        console.warn('Error loading official municipality boundaries:', error);
    }
}

// Find Nagarjun Municipality in the data
async function findNagarjunInData(municipalityData, source) {
    console.log(`Searching for Nagarjun Municipality in ${source}...`);
    console.log('Municipality data loaded, features count:', municipalityData.features?.length);
    
    // Search for Nagarjun Municipality
    const nagarjunFeature = municipalityData.features?.find(feature => {
        const name = feature.properties.NAME || '';
        return name.toLowerCase().includes('nagarjun');
    });
    
    if (nagarjunFeature) {
        console.log('Nagarjun Municipality found:', nagarjunFeature.properties);
        nagarjunPolygon = L.geoJSON(nagarjunFeature, {
            style: {
                color: '#fbbf24',
                weight: 3,
                opacity: 0,
                fillColor: '#fbbf24',
                fillOpacity: 0
            }
        }).addTo(map);
        console.log('Nagarjun Municipality boundary added successfully');
    } else {
        console.warn('Nagarjun Municipality not found in current data');
        // Log available municipality names for debugging
        const municipalityNames = municipalityData.features?.map(f => 
            f.properties.NAME || ''
        ).filter(name => name && name.toLowerCase().includes('nagar')).slice(0, 10);
        console.log('Sample municipalities with "nagar":', municipalityNames);
    }
}

// Load district boundaries as fallback for province data
async function loadDistrictBoundaries() {
    try {
        console.log('Loading official district boundaries as fallback...');
        
        // Try official district sources
        const sources = [
            'https://raw.githubusercontent.com/Acesmndr/nepal-geojson/master/generated-geojson/districts.geojson',
            'https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-districts-new.geojson'
        ];
        
        for (const source of sources) {
            try {
                const districtResponse = await fetch(source);
                if (!districtResponse.ok) continue;
                
                const districtData = await districtResponse.json();
                console.log(`District data loaded from ${source}, features count:`, districtData.features?.length);
                
                // Find Kathmandu district (where Nagarjun Municipality is located)
                const kathmanduFeature = districtData.features?.find(feature => {
                    const name = feature.properties.NAME || feature.properties.DISTRICT || '';
                    return name.toLowerCase().includes('kathmandu');
                });
                
                if (kathmanduFeature) {
                    console.log('Kathmandu District found as regional boundary:', kathmanduFeature.properties);
                    // Use this as proxy for Bagmati Province if province data wasn't found
                    if (!bagmatiPolygon) {
                        bagmatiPolygon = L.geoJSON(kathmanduFeature, {
                            style: {
                                color: '#60a5fa',
                                weight: 3,
                                opacity: 0,
                                fillColor: '#60a5fa',
                                fillOpacity: 0
                            }
                        }).addTo(map);
                        console.log('Using Kathmandu District as regional boundary proxy');
                    }
                }
                return; // Success, exit function
                
            } catch (err) {
                console.warn(`Failed to load districts from ${source}:`, err);
            }
        }
        
        console.warn('All district boundary sources failed');
        
    } catch (error) {
        console.warn('Error loading district boundaries:', error);
    }
}

// Fallback function with simplified boundaries (NOTE: Does not include Kalapani disputed territories)
function loadFallbackBoundaries() {
    console.log('Loading fallback boundaries...');
    console.warn('WARNING: Fallback boundaries do not include Kalapani, Lipulekh, and Limpiyadhura territories');
    
    // More accurate Nepal outline (simplified but recognizable shape)
    const nepalOutline = [
        [30.447, 80.056], [30.42, 80.52], [30.35, 81.0], [30.25, 81.5], [30.15, 82.0], 
        [30.05, 82.5], [29.95, 83.0], [29.85, 83.5], [29.75, 84.0], [29.65, 84.5],
        [29.55, 85.0], [29.45, 85.5], [29.35, 86.0], [29.25, 86.5], [29.15, 87.0],
        [29.05, 87.5], [28.95, 88.0], [28.85, 88.201], [28.7, 88.15], [28.5, 88.0],
        [28.3, 87.8], [28.1, 87.6], [27.9, 87.4], [27.7, 87.2], [27.5, 87.0],
        [27.3, 86.8], [27.1, 86.6], [26.9, 86.4], [26.7, 86.2], [26.5, 86.0],
        [26.4, 85.8], [26.35, 85.6], [26.3, 85.4], [26.25, 85.2], [26.2, 85.0],
        [26.25, 84.8], [26.3, 84.6], [26.35, 84.4], [26.4, 84.2], [26.45, 84.0],
        [26.5, 83.8], [26.55, 83.6], [26.6, 83.4], [26.65, 83.2], [26.7, 83.0],
        [26.8, 82.8], [26.9, 82.6], [27.0, 82.4], [27.1, 82.2], [27.2, 82.0],
        [27.3, 81.8], [27.4, 81.6], [27.5, 81.4], [27.6, 81.2], [27.7, 81.0],
        [27.8, 80.8], [27.9, 80.6], [28.0, 80.4], [28.2, 80.2], [28.5, 80.1],
        [28.8, 80.05], [29.2, 80.03], [29.6, 80.04], [30.0, 80.05], [30.447, 80.056]
    ];
    
    nepalPolygon = L.polygon(nepalOutline, {
        color: '#34d399',
        weight: 3,
        opacity: 0.8,
        fillColor: '#34d399',
        fillOpacity: 0.1,
        className: 'nepal-highlight'
    }).addTo(map);
    
    // Bagmati Province outline (more realistic shape around Kathmandu valley)
    const bagmatiOutline = [
        [28.3949, 84.9180], [28.35, 85.1], [28.3, 85.3], [28.25, 85.5], [28.2, 85.7], 
        [28.1, 85.9], [28.0, 86.0], [27.9, 86.1], [27.8, 86.15], [27.7, 86.1654],
        [27.6, 86.1], [27.5, 86.05], [27.4, 85.95], [27.3, 85.85], [27.2, 85.75],
        [27.1, 85.65], [27.0873, 85.55], [27.1, 85.45], [27.12, 85.35], [27.15, 85.25],
        [27.2, 85.15], [27.25, 85.05], [27.3, 84.98], [27.4, 84.94], [27.5, 84.92],
        [27.6, 84.91], [27.7, 84.915], [27.8, 84.92], [27.9, 84.93], [28.0, 84.95],
        [28.1, 84.98], [28.2, 85.0], [28.3, 85.02], [28.3949, 84.9180]
    ];
    
    bagmatiPolygon = L.polygon(bagmatiOutline, {
        color: '#60a5fa',
        weight: 3,
        opacity: 0,
        fillColor: '#60a5fa',
        fillOpacity: 0,
        className: 'bagmati-highlight'
    }).addTo(map);
    
    // Nagarjun Municipality outline (more detailed local boundary)
    const nagarjunOutline = [
        [27.7800, 85.2200], [27.7780, 85.2250], [27.7750, 85.2300], [27.7720, 85.2350],
        [27.7690, 85.2400], [27.7650, 85.2450], [27.7600, 85.2500], [27.7550, 85.2550],
        [27.7500, 85.2600], [27.7450, 85.2650], [27.7400, 85.2700], [27.7380, 85.2750],
        [27.7360, 85.2800], [27.7350, 85.2850], [27.7340, 85.2900], [27.7335, 85.2950],
        [27.7330, 85.3000], [27.7325, 85.3050], [27.7320, 85.3100], [27.7315, 85.3150],
        [27.7310, 85.3200], [27.7280, 85.3180], [27.7250, 85.3160], [27.7220, 85.3140],
        [27.7190, 85.3120], [27.7160, 85.3100], [27.7130, 85.3080], [27.7100, 85.3060],
        [27.7070, 85.3040], [27.7040, 85.3020], [27.7010, 85.3000], [27.6980, 85.2980],
        [27.6950, 85.2960], [27.6920, 85.2940], [27.6900, 85.2920], [27.6920, 85.2900],
        [27.6940, 85.2880], [27.6960, 85.2860], [27.6980, 85.2840], [27.7000, 85.2820],
        [27.7020, 85.2800], [27.7040, 85.2780], [27.7060, 85.2760], [27.7080, 85.2740],
        [27.7100, 85.2720], [27.7120, 85.2700], [27.7140, 85.2680], [27.7160, 85.2660],
        [27.7180, 85.2640], [27.7200, 85.2620], [27.7220, 85.2600], [27.7240, 85.2580],
        [27.7260, 85.2560], [27.7280, 85.2540], [27.7300, 85.2520], [27.7320, 85.2500],
        [27.7340, 85.2480], [27.7360, 85.2460], [27.7380, 85.2440], [27.7400, 85.2420],
        [27.7420, 85.2400], [27.7440, 85.2380], [27.7460, 85.2360], [27.7480, 85.2340],
        [27.7500, 85.2320], [27.7520, 85.2300], [27.7540, 85.2280], [27.7560, 85.2260],
        [27.7580, 85.2240], [27.7600, 85.2220], [27.7650, 85.2210], [27.7700, 85.2205],
        [27.7750, 85.2202], [27.7800, 85.2200]
    ];
    
    nagarjunPolygon = L.polygon(nagarjunOutline, {
        color: '#fbbf24',
        weight: 3,
        opacity: 0,
        fillColor: '#fbbf24',
        fillOpacity: 0,
        className: 'nagarjun-highlight'
    }).addTo(map);
    
    console.log('Fallback boundaries loaded successfully');
}


// Digital divide stories from Bhimdhunga, Nagarjun
const houseData = [
    {
        id: 1,
        lat: 27.725362, 
        lng: 85.224747,
        title: "Tech-Resistant Household",
        youtubeId: "dQw4w9WgXcQ", // Example YouTube video ID - replace with actual interviews
        audio: "audio/family1_testimony.mp3",
        digitalAccess: "low",
        ageCategory: "digital_native",
        selfEfficacy: "high_confidence",
        ageJourneyOrder: 4,
        efficacyJourneyOrder: 4,
        profile: {
            headshot: "https://via.placeholder.com/120x120/3b82f6/ffffff?text=R.S.",
            role: "Software Engineer & Family Head",
            description: "A tech professional who works remotely while managing a digitally connected household. Despite having advanced digital access, his family faces challenges of screen time management and maintaining human connections."
        },
        photos: [
            {
                image: "https://via.placeholder.com/400x200/f1f5f9/64748b?text=Home+Office+Setup",
                quote: "\"In the past when there is no phone all the family members sit together... but after all the people got phones everybody enjoys their own, not like before\" - Digital Divide Reality"
            },
            {
                image: "https://via.placeholder.com/400x200/f1f5f9/64748b?text=Family+Tech+Time",
                quote: "\"The older generation doesn't have knowledge about technology, but new generation went too far, that's why we have to teach the older generation\" - Generational Gap"
            },
            {
                image: "https://via.placeholder.com/400x200/f1f5f9/64748b?text=Digital+Learning",
                quote: "\"Online class was so difficult because data didn't work properly... we have to go on the height, top of the hills because of poor network\" - Network Challenges"
            }
        ],
        stats: {
            internetSpeed: "100 Mbps Fiber",
            devices: "5 smartphones, 3 laptops, 2 tablets",
            monthlyDataCost: "NPR 2,500",
            digitalSkills: "Advanced",
            onlineServices: "Banking, Shopping, Education, Work"
        },
        story: {
            quote: "\"Everyday argument. We scold them but still they don't respond properly... Classic tech is worst\" - Internet Provider Issues",
            reality: "Despite having high-speed connectivity, the family experiences the social costs of digital saturation and infrastructure reliability issues that affect daily life.",
            testimonial: "Connection cost NPR 17,000, 7-8 years ago. Speed varies - 350mbps in some homes, 50-80mbps in others. But the real cost is how technology changed our family dynamics.",
            resident: "Sudiksha Tamang"
        }
    },
    {
        id: 2,
        lat: 27.738000,
        lng: 85.238667,
        title: "Hill farming household",
        video: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
        audio: "audio/family2_testimony.mp3",
        digitalAccess: "high",
        stats: {
            internetSpeed: "50 Mbps Fiber",
            devices: "4 smartphones, 2 laptops, 1 tablet",
            monthlyDataCost: "NPR 1,800",
            digitalSkills: "Good",
            onlineServices: "Banking, Education, Shopping"
        },
        story: {
            quote: "\"Our children can do homework online, but when internet fails, they struggle with offline alternatives.\"",
            reality: "High-speed internet enables digital learning, but creates dependency. Power outages and connectivity issues significantly impact daily routines.",
            testimonial: "We're digitally connected but realize how dependent we've become. During the last internet outage, even simple tasks became difficult.",
            resident: "Pratima Tamang, Farmer"
        }
    },
    {
        id: 3,
        lat: 27.738500,
        lng: 85.237750,
        title: "Agricultural Knowledge Seeker Household",
        video: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
        digitalAccess: "high",
        ageCategory: "late_adopter",
        selfEfficacy: "low_persistence",
        ageJourneyOrder: 3,
        efficacyJourneyOrder: 2,
        participant: "Ram Raj Lama", // Reference to actual interview participant
        stats: {
            internetSpeed: "25 Mbps",
            devices: "5 smartphones, 1 laptop",
            monthlyDataCost: "NPR 1,500",
            digitalSkills: "Mixed - youth advanced, elders basic",
            onlineServices: "Social media, some banking"
        },
        story: {
            quote: "\"My grandchildren help me with digital payments, but I worry about being dependent on them.\"",
            reality: "Three generations under one roof experience different levels of digital comfort, creating both support networks and dependencies.",
            testimonial: "The young ones are always on phones helping us older people with apps and forms. It's good but also makes us feel helpless sometimes.",
            resident: "Ram Raj Lama"
        }
    },
    {
        id: 4,
        lat: 27.739389,
        lng: 85.236333,
        title: "Farming Crew Household",
        video: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
        audio: "audio/farming_family.mp3",
        digitalAccess: "medium",
        participant: "Dhan Bahadur Tamang", // Reference to actual interview participant
        profile: {
            headshot: "photos/headshots/Dhanbahadur Tamang.JPG",
            role: "40-year-old Farmer",
            description: "Dhan Bahadur Tamang, father and practical phone user. Uses smartphone mainly for calls (2-4 daily) and leisure browsing. Been using phones 8-10 years, WiFi for 6-7 years. Handles family's online banking while others don't."
        },
        stats: {
            internetSpeed: "Unknown (Supernet provider - \"It works normally\")",
            devices: "Multiple smartphones (family)",
            monthlyDataCost: "Not specified",
            digitalSkills: "Basic use - sticks to familiar functions",
            onlineServices: "eSewa, YouTube (news), Facebook, TikTok (leisure)"
        },
        story: {
            quote: "\"I just use the things that I already know. New things... I don't know. I haven't studied. I don't know how to write, I just watch.\"",
            reality: "Practical digital users who stick to familiar functions, representing steady but limited technology adoption patterns in farming communities.",
            testimonial: "Mobile phone has become the go-to thing for leisure time. We charge it when working, use it while eating breakfast, lunch, before sleeping - about 1 hour total.",
            resident: "Dhan Bahadur Tamang, Farmer"
        },
        photos: [
            {
                image: "placeholder1.jpg",
                quote: "\"I just use the things that I already know. New things... I don't know. I haven't studied. I don't know how to write, I just watch.\""
            },
            {
                image: "placeholder2.jpg", 
                quote: "\"I watch only Nepali news that I find trustworthy - the ones about what's happening around the world, fights and wars. I watch all the news channels on YouTube.\""
            },
            {
                image: "placeholder3.jpg",
                quote: "\"Mobile phone has become the go-to thing for leisure time. We charge it when working, use it while eating breakfast, lunch, before sleeping - about 1 hour total.\""
            }
        ]
    },
    {
        id: 5,
        lat: 27.731611,
        lng: 85.236083,
        title: "Cross-Border Family Household",
        video: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
        audio: "audio/rural_urban_family.mp3",
        digitalAccess: "medium",
        stats: {
            internetSpeed: "20 Mbps (inconsistent)",
            devices: "4 smartphones, 1 shared laptop",
            monthlyDataCost: "NPR 1,200",
            digitalSkills: "Developing",
            onlineServices: "Remittances, video calls, basic banking"
        },
        story: {
            quote: "\"We moved here from the village for better internet, but still help relatives back home with digital services.\"",
            reality: "Families serve as digital bridges between rural areas and urban connectivity, supporting extended networks while managing their own digital adaptation.",
            testimonial: "Every week relatives call asking us to help them with online forms or digital payments. We're like the tech support for our whole extended family.",
            resident: "Mishri Tamang"
        }
    },
    {
        id: 6,
        lat: 27.729194,
        lng: 85.234389,
        title: "Newcomer's perspective of community",
        video: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
        audio: "audio/elderly_adaptation.mp3",
        digitalAccess: "high",
        ageCategory: "elderly",
        selfEfficacy: "complete_avoidance",
        ageJourneyOrder: 1,
        efficacyJourneyOrder: 1,
        participant: "Maili Tamang", // Reference to actual interview participant
        stats: {
            internetSpeed: "10 Mbps (shared)",
            devices: "2 basic smartphones",
            monthlyDataCost: "NPR 800",
            digitalSkills: "Limited but learning",
            onlineServices: "WhatsApp, some banking"
        },
        story: {
            quote: "\"Our grandchildren taught us WhatsApp, but online banking still scares us.\"",
            reality: "Senior citizens face the steepest learning curve in digital adoption, often relying on family members for digital tasks while trying to maintain independence.",
            testimonial: "We want to learn but worry about making mistakes with money online. The buttons are small and the language is confusing.",
            resident: "Nirisuchika Tamang, cloth shopowner"
        }
    },
    {
        id: 7,
        lat: 27.726012,
        lng: 85.224607,
        title: "Young Professional's Home Office",
        video: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
        audio: "audio/remote_worker.mp3",
        digitalAccess: "high",
        stats: {
            internetSpeed: "100 Mbps dedicated",
            devices: "2 laptops, 3 smartphones, tablet, smart TV",
            monthlyDataCost: "NPR 3,000",
            digitalSkills: "Expert level",
            onlineServices: "All digital - work, banking, entertainment, shopping"
        },
        story: {
            quote: "\"I live completely digital, but I see how it isolates me from neighbors who aren't as connected.\"",
            reality: "Remote workers represent the most digitally integrated segment but often become inadvertent examples of digital inequality in their communities.",
            testimonial: "My internet is faster than some offices, but my elderly neighbor asks me to help with basic phone calls because her connection is unreliable.",
            resident: "Anita Shrestha, Software Developer"
        }
    },
    {
        id: 8,
        lat: 27.726464,
        lng: 85.224558,
        title: "Extended Family Home",
        video: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
        audio: "audio/extended_family.mp3",
        digitalAccess: "high",
        participant: "Sikha Limbu", // Reference to actual interview participant
        profile: {
            headshot: "interviews/houses/high access/Extended family home/Sikha Limbu.JPG",
            role: "26-year-old Agriculture & Homemaker",
            description: "26-year-old married woman from Majhuwa, agriculture and homemaker. Lives in large extended family (15 members). Uses phone 6-7 hours daily and is excited to learn new technology, but faces technical limitations."
        },
        stats: {
            internetSpeed: "Not specified (uses Classic-Tech provider)",
            devices: "9 smartphones (household total)",
            monthlyDataCost: "Not specified",
            digitalSkills: "Medium-High - enthusiastic learner, agricultural research",
            onlineServices: "YouTube (farming research - godachitra/passion fruit), Facebook (shopping)"
        },
        story: {
            quote: "\"I'm excited to learn new technology, but when I face obstacles I repeat it for a bit, then if I can't figure it out, I just leave it. Payment apps are important but they don't work on my phone - we tried a lot but couldn't get them working.\"",
            reality: "Technology enthusiasm meets technical limitations in large households where 15 family members navigate varying digital comfort levels and infrastructure challenges.",
            testimonial: "We taught Papa how to pick up calls and he learned a little bit, but Mummy doesn't have interest and we didn't teach her. My husband uses mobile banking but I don't. Women mostly watch TikTok, men watch bike and vehicle content.",
            resident: "Sikha Limbu, Agriculture & Homemaker"
        },
        photos: [
            {
                image: "placeholder1.jpg",
                quote: "\"I ordered jewelry worth Rs. 2000 and got scammed - didn't receive the complete product. After that my trust level decreased in online shopping... but after seeing new stuff, I still want to order.\""
            },
            {
                image: "placeholder2.jpg", 
                quote: "\"We taught Papa how to pick up calls and he learned a little bit, but Mummy doesn't have interest and we didn't teach her.\""
            },
            {
                image: "placeholder3.jpg",
                quote: "\"When we grow new things, we use internet. Recently we're growing godachitra (passion fruit) and use YouTube for farming information.\""
            }
        ]
    },
    {
        id: 9,
        lat: 27.726005,
        lng: 85.224614,
        title: "Pragmatic Driver Household",
        video: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
        audio: "audio/extended_family.mp3",
        digitalAccess: "low",
        stats: {
            internetSpeed: "N/A",
            devices: "4 phones",
            monthlyDataCost: "Mobile data",
            digitalSkills: "Basic",
            onlineServices: "eSewa"
        },
        story: {
            quote: "\"Our house became the family tech support center - relatives come here for internet and digital help.\"",
            reality: "Well-connected households often become informal community digital service centers, supporting extended networks while managing their own high usage demands.",
            testimonial: "Every weekend relatives visit to video call family abroad, print documents, or get help with government forms online. We're like a one-family internet cafe.",
            resident: "Tej Tamang, Local route driver"
        }
    },
    {
        id: 10,
        lat: 27.717359398869263,
        lng: 85.33453670762191,
        title: "ALIN Foundation Building",
        digitalAccess: "foundation",
        isFoundation: true,
        foundation: {
            name: "All In Foundation",
            mission: "ALIN is a social impact company that works in various sectors to address the unjust walls of power and privilege in Nepal and beyond.",
            description: "All In Solutions Fellowship is an interdisciplinary fellowship that focuses on innovative solutions to Nepal's (or global) complex problems.",
            logo: "ALIN_logo.jpg",
            // teamPhotos: [
            //     {
            //         name: "Research Fellow 1",
            //         role: "Digital Divide Researcher",
            //         photo: "https://via.placeholder.com/150x150/3b82f6/ffffff?text=RF1",
            //         bio: "Focuses on rural-urban digital transition patterns"
            //     },
            //     {
            //         name: "Research Fellow 2", 
            //         role: "Community Technology Coordinator",
            //         photo: "https://via.placeholder.com/150x150/10b981/ffffff?text=RF2",
            //         bio: "Specializes in community-based digital literacy programs"
            //     },
            //     {
            //         name: "Research Fellow 3",
            //         role: "Data Storytelling Specialist", 
            //         photo: "https://via.placeholder.com/150x150/f59e0b/ffffff?text=RF3",
            //         bio: "Creates multimedia narratives from research findings"
            //     }
            // ],
            faq: [
                {
                    question: "Who are we?",
                    answer: "We are a group of emerging professionals — a future constitutional lawyer, a public health practitioner in training, a aspiring cognitive scientist, and an economist in the making. Together, we aim to serve as a bridge(SETU) between digital literacy and lived experiences."
                },
                {
                    question: "What is this research about?",
                    answer: "We are conducting a qualitative study to understand the lived experirence of digital divide in Bhimdhunga, Ward No. 8."
                },
                {
                    question: "How are the research findings made available?",
                    answer: "Through this interactive platform you can either wander freely between houses to discover individual stories, or follow guided journeys that reveal how digital adoption varies across generations and circumstances. A comprehensive written report with detailed analysis is also available [here]."
                },
                {
                    question: "Why focus on lived experiences?",
                    answer: "To highlight how people personally experience and navigate digital access, not just the numbers."
                }
            ],
            fellowshipProjects: [
                {
                    title: "Mankiri",
                    description: "A campaign aiming to promote the visibility and foster solidarity and open discussion on mental health of peri and post menopausal women",
                    status: "Completed",
                    link: "https://www.instagram.com/mankiriprojectnepal/"
                },
                {
                    title: "Shreejanshil",
                    description: "A documentary journey into the daily struggles, hopes and change in the Dom community",
                    status: "Completed",
                    link: "https://www.instagram.com/shreejanshil/"
                }
            ]
        }
    }
];

// Community area stories from Nagarjun Municipality Ward 8
const areaData = [
    {
        id: 1,
        lat: 27.732,
        lng: 85.240,
        title: "Majuwa Community Area",
        areaName: "Majuwa",
        video: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
        audio: "audio/majuwa_community.mp3",
        communityType: "traditional_village",
        digitalAccess: "mixed",
        stats: {
            households: "45 households",
            internetCoverage: "78% coverage",
            averageSpeed: "15-25 Mbps",
            digitalLiteracy: "45% adults, 85% youth",
            mainChallenges: "Infrastructure gaps, cost barriers"
        },
        story: {
            quote: "\"We live between two worlds - our traditional village life and the digital age demanding connection.\"",
            community_voice: "Majuwa represents the intersection of traditional Nepali village culture with modern digital demands. While younger generations adapt quickly, older community members struggle with the rapid technological changes.",
            digital_divide: "The community shows stark contrasts - tech-savvy youth helping elderly neighbors access government services online, while traditional practices continue alongside smartphone usage.",
            resident: "Community Leaders & Residents of Majuwa"
        },
        challenges: [
            "Inconsistent internet connectivity during monsoon",
            "High data costs relative to local incomes", 
            "Limited digital literacy programs for seniors",
            "Language barriers with English-only interfaces"
        ]
    },
    {
        id: 2,
        lat: 27.728,
        lng: 85.245,
        title: "Thaple Community Area", 
        areaName: "Thaple",
        video: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
        audio: "audio/thaple_voices.mp3",
        communityType: "mixed_residential",
        digitalAccess: "moderate",
        stats: {
            households: "62 households",
            internetCoverage: "82% coverage", 
            averageSpeed: "20-40 Mbps",
            digitalLiteracy: "58% adults, 90% youth",
            mainChallenges: "Quality inconsistency, digital skills gap"
        },
        story: {
            quote: "\"Every family has smartphones, but not every family knows how to use them for anything beyond calls and social media.\"",
            community_voice: "Thaple has better infrastructure than neighboring areas but faces quality and reliability issues. The community is actively working on digital inclusion initiatives.",
            digital_divide: "While most households have internet access, there's a significant divide in how effectively different demographics utilize digital services - from basic communication to accessing healthcare and education services online.",
            resident: "Thaple Community Development Committee"
        },
        challenges: [
            "Service interruptions affect home-based businesses",
            "Lack of local technical support",
            "Digital payment adoption slow among elderly",
            "Online education challenges during COVID highlighted gaps"
        ]
    },
    {
        id: 3,
        lat: 27.735,
        lng: 85.238,
        title: "Buspark Community Area",
        areaName: "Buspark", 
        video: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
        audio: "audio/buspark_interviews.mp3",
        communityType: "commercial_residential",
        digitalAccess: "high",
        stats: {
            households: "38 households + businesses",
            internetCoverage: "95% coverage",
            averageSpeed: "30-50 Mbps", 
            digitalLiteracy: "72% adults, 95% youth",
            mainChallenges: "Digital security, information overload"
        },
        story: {
            quote: "\"Being near the bus park means we're connected to everything - roads, internet, opportunities, but also all the problems that come with connectivity.\"",
            community_voice: "Buspark area benefits from commercial infrastructure with high-speed internet and digital services, but faces challenges of urban digital life including security concerns and information management.",
            digital_divide: "The divide here isn't about access but about digital wellness and security. High connectivity brings cybersecurity risks, online fraud attempts, and the challenge of managing information overload.",
            resident: "Local Business Owners & Residents"
        },
        challenges: [
            "Cybersecurity threats and online fraud attempts",
            "Information overload affecting productivity", 
            "Privacy concerns with multiple digital services",
            "Balancing screen time in families"
        ]
    }
];

// Custom house icons based on digital access level
const getLocationIcon = (accessLevel) => {
    let color, className, iconHtml;
    
    switch(accessLevel) {
        case 'high':
            color = '#22c55e'; // Green for good connectivity
            className = 'house-marker high-access';
            iconHtml = `<i class="fa-solid fa-house fa-beat" style="color: ${color}; font-size: 24px;"></i>`;
            break;
        case 'medium':
            color = '#fbbf24'; // Yellow for limited access
            className = 'house-marker medium-access';
            iconHtml = `<i class="fa-solid fa-house fa-beat" style="color: ${color}; font-size: 24px;"></i>`;
            break;
        case 'low':
            color = '#ef4444'; // Red for poor connectivity/high digital divide
            className = 'house-marker low-access';
            iconHtml = `<i class="fa-solid fa-house fa-beat" style="color: ${color}; font-size: 24px;"></i>`;
            break;
        case 'foundation':
            color = '#dc2626'; // Red for foundation
            className = 'foundation-marker';
            iconHtml = `<i class="fa-solid fa-location-dot fa-beat" style="color: ${color}; font-size: 28px;"></i>`;
            break;
        default:
            color = '#6b7280'; // Gray for unknown
            className = 'house-marker';
            iconHtml = `<i class="fa-solid fa-house fa-beat" style="color: ${color}; font-size: 24px;"></i>`;
    }
    
    return L.divIcon({
        html: iconHtml,
        iconSize: [30, 30],
        className: className,
        iconAnchor: [15, 25]
    });
};

// Area data kept for reference (not used for markers, but for future community information)

// Store markers but don't add them immediately
let houseMarkers = [];
let foundationLabel = null;
let foundationHouse = null;

houseData.forEach(house => {
    const marker = L.marker([house.lat, house.lng], { icon: getLocationIcon(house.digitalAccess) })
        .on('click', () => openPopup(house));
    houseMarkers.push(marker);
    
    // Add hover interactions for manual exploration
    marker.on('mouseover', function(e) {
        if (house.story?.resident) {
            showHoverPreview(house.story.resident, e.originalEvent);
        }
    });
    
    marker.on('mouseout', function() {
        hideHoverPreview();
    });
    
    // Store reference for highlighting system (only non-foundation houses)
    if (!house.isFoundation) {
        markerReferences.houses.push(marker);
    }
    
    // Create label for foundation marker
    if (house.isFoundation) {
        foundationHouse = house; // Store reference to foundation house data
        foundationLabel = L.marker([house.lat - 0.001, house.lng], {
            icon: L.divIcon({
                html: '<div class="foundation-label">All In Foundation</div>',
                className: 'foundation-label-container',
                iconSize: [140, 28],
                iconAnchor: [70, 14]
            })
        }).on('click', () => openPopup(foundationHouse));
    }
});

// Community area circles (oval overlays with center + radius)
let thapleCircle = null;
let busparkCircle = null; 
let wardOfficeCircle = null;
let majuwaCircle = null;

// Area text labels
let areaLabels = [];
let wardOfficeMarker = null;
let schoolMarker = null;
let khajagharMarkers = [];
let streetInterviewMarkers = [];
let shopMarker = null;

// Create area circular overlays
function createAreaBoundaries() {
    // Thaple: blue theme, 400m radius
    thapleCircle = L.circle([27.738486, 85.235668], {
        color: '#2563eb',
        weight: 3,
        opacity: 0,
        fillColor: '#3b82f6',
        fillOpacity: 0,
        radius: 400,
        className: 'thaple-highlight'
    }).addTo(map);
    
    // Bhimdhunga Buspark: orange theme, 350m radius
    busparkCircle = L.circle([27.729622, 85.236152], {
        color: '#ea580c',
        weight: 3,
        opacity: 0,
        fillColor: '#f97316',
        fillOpacity: 0,
        radius: 350,
        className: 'buspark-highlight'
    }).addTo(map);
    
    // Ward Office: purple theme, 50m radius (reduced)
    wardOfficeCircle = L.circle([27.732760, 85.233694], {
        color: '#7c3aed',
        weight: 3,
        opacity: 0,
        fillColor: '#8b5cf6',
        fillOpacity: 0,
        radius: 50,
        className: 'wardoffice-highlight'
    }).addTo(map);
    
    // Majuwa: green theme, 250m radius
    majuwaCircle = L.circle([27.725122, 85.226066], {
        color: '#16a34a',
        weight: 3,
        opacity: 0,
        fillColor: '#22c55e',
        fillOpacity: 0,
        radius: 250,
        className: 'majuwa-highlight'
    }).addTo(map);
    
    // Add text labels for all areas
    createAreaLabels();
    
    // Create government building icon for Ward Office
    createWardOfficeMarker();
    
    // Create school icon
    createSchoolMarker();
    
    // Create khajaghar (tea shop) markers
    createKhajagharMarkers();
    
    // Create street interview markers
    createStreetInterviewMarkers();
    
    // Create shop marker
    createShopMarker();
}

// Create text labels for areas
function createAreaLabels() {
    const labelStyle = {
        permanent: true,
        direction: 'center',
        className: 'area-label'
    };
    
    // Thaple label
    const thapleLabel = L.marker([27.738486, 85.235668], {
        icon: L.divIcon({
            html: '<div class="area-text-label">Thaple</div>',
            className: 'area-label-container',
            iconSize: [60, 20],
            iconAnchor: [30, 10]
        })
    }).addTo(map);
    areaLabels.push(thapleLabel);
    
    // Buspark label
    const busparkLabel = L.marker([27.729622, 85.236152], {
        icon: L.divIcon({
            html: '<div class="area-text-label">Buspark</div>',
            className: 'area-label-container',
            iconSize: [60, 20],
            iconAnchor: [30, 10]
        })
    }).addTo(map);
    areaLabels.push(busparkLabel);
    
    // Majuwa label
    const majuwaLabel = L.marker([27.725122, 85.226066], {
        icon: L.divIcon({
            html: '<div class="area-text-label">Majuwa</div>',
            className: 'area-label-container',
            iconSize: [60, 20],
            iconAnchor: [30, 10]
        })
    }).addTo(map);
    areaLabels.push(majuwaLabel);
    
    // Ward Office label (positioned slightly above the building icon)
    const wardLabel = L.marker([27.732760, 85.233714], {
        icon: L.divIcon({
            html: '<div class="area-text-label ward-label">Ward Office</div>',
            className: 'area-label-container',
            iconSize: [80, 20],
            iconAnchor: [40, 10]
        })
    }).addTo(map);
    areaLabels.push(wardLabel);
}

// Create government building marker for Ward Office
function createWardOfficeMarker() {
    wardOfficeMarker = L.marker([27.732760, 85.233694], {
        icon: L.divIcon({
            html: `
                <div class="government-building-icon">
                    <div class="building-base"></div>
                    <div class="building-pillars">
                        <div class="pillar"></div>
                        <div class="pillar"></div>
                        <div class="pillar"></div>
                    </div>
                    <div class="building-roof"></div>
                </div>
            `,
            className: 'ward-office-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 35]
        })
    }).on('click', () => openWardOfficePopup()).addTo(map);
}

// Create school marker
function createSchoolMarker() {
    schoolMarker = L.marker([27.724667, 85.228028], {
        icon: L.divIcon({
            html: `
                <div class="school-icon">
                    <div class="school-symbol">🎓</div>
                    <div class="school-base">
                        <div class="school-text">School</div>
                    </div>
                </div>
            `,
            className: 'school-marker',
            iconSize: [50, 45],
            iconAnchor: [25, 40]
        })
    }).on('click', () => openSchoolPopup()).addTo(map);
    
    // Add hover interactions for manual exploration
    schoolMarker.on('mouseover', function(e) {
        showHoverPreviewWithAge("Principal", "52", e.originalEvent);
    });
    
    schoolMarker.on('mouseout', function() {
        hideHoverPreview();
    });
    
    // Store reference for highlighting system
    markerReferences.school = schoolMarker;
}

// Create khajaghar (tea shop) markers
function createKhajagharMarkers() {
    // Khajaghar locations (positioned around the community areas)
    const khajagharLocations = [
        {
            lat: 27.724592,
            lng: 85.224491,
            name: "Majuwa Khajaghar",
            participant: "Sunita Tamang",
            age: "45"
        },
        {
            lat: 27.739199,
            lng: 85.236208,
            name: "Thaple Khajaghar",
            participant: "Aman Tamang",
            age: "17"
        }
    ];
    
    khajagharLocations.forEach((location, index) => {
        const khajagharMarker = L.marker([location.lat, location.lng], {
            icon: L.divIcon({
                html: `<i class="fa-solid fa-mug-hot fa-bounce" style="color: #dc2626; font-size: 20px;"></i>`,
                iconSize: [25, 25],
                className: 'khajaghar-marker',
                iconAnchor: [12.5, 20]
            })
        }).on('click', () => openKhajagharPopup(location)).addTo(map);
        
        // Add hover interactions for manual exploration
        khajagharMarker.on('mouseover', function(e) {
            if (location.participant) {
                showHoverPreviewWithAge(location.participant, location.age, e.originalEvent);
            }
        });
        
        khajagharMarker.on('mouseout', function() {
            hideHoverPreview();
        });
        
        khajagharMarkers.push(khajagharMarker);
        
        // Store reference for highlighting system with location name
        khajagharMarker.options.title = location.name;
        markerReferences.khajaghar.push(khajagharMarker);
    });
}

// Create street interview markers
function createStreetInterviewMarkers() {
    // Street interview locations
    const interviewLocations = [
        {
            lat: 27.731906,
            lng: 85.236138,
            name: "Street Interview ",
            interviewType: "cliff farmer",
            participant: "Samjhana Lama",
            age: "28"
        },
        {
            lat: 27.737444,
            lng: 85.233972,
            name: "Street Interview 2", 
            interviewType: "student",
            participant: "Bijaya Tamang",
            age: "17"
        },
        {
            lat: 27.726670,
            lng: 85.224680,
            name: "Street Interview 3",
            interviewType: "neighborhood",
            participant: "Maili Tamang",
            age: "58"
        }
    ];
    
    interviewLocations.forEach((location, index) => {
        const interviewMarker = L.marker([location.lat, location.lng], {
            icon: L.divIcon({
                html: `<i class="fa-solid fa-comments fa-beat" style="color: #6366f1; font-size: 18px;"></i>`,
                iconSize: [22, 22],
                className: 'interview-marker',
                iconAnchor: [11, 18]
            })
        }).on('click', () => openStreetInterviewPopup(location)).addTo(map);
        
        // Add hover interactions for manual exploration
        interviewMarker.on('mouseover', function(e) {
            if (location.participant) {
                showHoverPreviewWithAge(location.participant, location.age, e.originalEvent);
            }
        });
        
        interviewMarker.on('mouseout', function() {
            hideHoverPreview();
        });
        
        streetInterviewMarkers.push(interviewMarker);
        
        // Store reference for highlighting system with location name
        interviewMarker.options.title = location.name;
        markerReferences.streetInterviews.push(interviewMarker);
    });
}

// Create shop marker
function createShopMarker() {
    shopMarker = L.marker([27.729750, 85.236056], {
        icon: L.divIcon({
            html: `<i class="fa-solid fa-shop" style="color: #ea580c; font-size: 20px;"></i>`,
            iconSize: [25, 25],
            className: 'shop-marker',
            iconAnchor: [12.5, 20]
        })
    }).on('click', () => openShopPopup()).addTo(map);
}

// Enhanced cinematic sequence with user interaction
let userInteracted = false;

// Input detection for continuing the sequence
function waitForUserInput() {
    return new Promise((resolve) => {
        const handleInput = () => {
            if (!userInteracted) {
                userInteracted = true;
                document.removeEventListener('click', handleInput);
                document.removeEventListener('keydown', handleInput);
                resolve();
            }
        };
        
        document.addEventListener('click', handleInput);
        document.addEventListener('keydown', handleInput);
    });
}

// Cinematic video sequence to replace manual zoom
async function startVideoSequence() {
    console.log('startVideoSequence called');
    const statsOverlay = document.getElementById('national-stats-overlay');
    const videoOverlay = document.getElementById('cinematic-video-overlay');
    const cinematicVideo = document.getElementById('cinematic-video');
    const skipButton = document.getElementById('skip-video');
    
    console.log('Waiting for user input...');
    // Wait for user input
    await waitForUserInput();
    console.log('User input received, proceeding with video...');
    
    // Phase 1: Fade out stats, show video
    statsOverlay.style.animation = 'overlayFadeOut 1s ease-out forwards';
    
    setTimeout(() => {
        statsOverlay.style.display = 'none';
        videoOverlay.style.display = 'flex';
        videoOverlay.classList.add('video-fade-in');
        
        // Play the video with progressive fallback system
        cinematicVideo.currentTime = 0;
        cinematicVideo.muted = false; // Try with audio first
        
        const playPromise = cinematicVideo.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('Cinematic video started playing with audio');
                // Video is playing successfully with audio
            }).catch(e => {
                console.warn('Autoplay with audio failed, trying muted:', e);
                
                // Try muted autoplay
                cinematicVideo.muted = true;
                cinematicVideo.play().then(() => {
                    console.log('Cinematic video started playing muted');
                    // Show unmute button
                    showUnmuteButton(cinematicVideo, videoOverlay);
                }).catch(e2 => {
                    console.warn('Muted autoplay also failed:', e2);
                    // Show manual play button
                    showManualPlayButton(cinematicVideo, videoOverlay);
                });
            });
        } else {
            // Fallback for older browsers
            showManualPlayButton(cinematicVideo, videoOverlay);
        }
        
        // Skip button functionality
        skipButton.onclick = skipToMap;
        
        // When video ends, automatically go to map
        cinematicVideo.onended = skipToMap;
        
    }, 1000);
    
    function skipToMap() {
        videoOverlay.classList.add('video-fade-out');
        cinematicVideo.pause();
        
        setTimeout(() => {
            videoOverlay.style.display = 'none';
            videoOverlay.classList.remove('video-fade-in', 'video-fade-out');
            
            // Set map to Nagarjun Municipality Ward 8 center
            map.setView([27.733, 85.240], 15);
            
            // Create area boundaries
            createAreaBoundaries();
            
            // Show navbar after cinematic sequence
            showNavbar();
            
            // Start area highlighting sequence
            setTimeout(() => {
                startAreaHighlighting();
            }, 1000);
            
        }, 500);
    }
    
    // Load all Nagarjun areas at once - no dramatic sequence
    function startAreaHighlighting() {
        // Show all areas immediately with subtle highlighting
        if (thapleCircle) {
            thapleCircle.setStyle({
                color: '#2563eb',
                weight: 2,
                opacity: 0.7,
                fillColor: '#3b82f6',
                fillOpacity: 0.15
            });
        }
        
        if (busparkCircle) {
            busparkCircle.setStyle({
                color: '#ea580c',
                weight: 2,
                opacity: 0.7,
                fillColor: '#f97316',
                fillOpacity: 0.15
            });
        }
        
        if (wardOfficeCircle) {
            wardOfficeCircle.setStyle({
                color: '#7c3aed',
                weight: 2,
                opacity: 0.7,
                fillColor: '#8b5cf6',
                fillOpacity: 0.15
            });
        }
        
        if (majuwaCircle) {
            majuwaCircle.setStyle({
                color: '#16a34a',
                weight: 2,
                opacity: 0.7,
                fillColor: '#22c55e',
                fillOpacity: 0.15
            });
        }
        
        // Add house markers immediately after areas load
        setTimeout(() => {
            houseMarkers.forEach((marker, index) => {
                setTimeout(() => {
                    marker.addTo(map);
                    const element = marker.getElement();
                    if (element) {
                        element.style.animation = 'markerDrop 0.6s ease-out';
                    }
                }, index * 200);
            });
            
            // Add foundation label if it exists
            if (foundationLabel) {
                setTimeout(() => {
                    foundationLabel.addTo(map);
                }, houseMarkers.length * 200 + 200);
            }
        }, 500);
    }
}

// Complete cinematic sequence on page load
window.addEventListener('load', async () => {
    const splashScreen = document.getElementById('splash-screen');
    const statsOverlay = document.getElementById('national-stats-overlay');
    const videoOverlay = document.getElementById('cinematic-video-overlay');
    
    // Initially hide overlays until we're ready
    statsOverlay.style.display = 'none';
    videoOverlay.style.display = 'none';
    
    // Load geographic boundaries in background (don't wait for it)
    console.log('Starting boundary loading in background...');
    loadGeographicBoundaries().catch(error => {
        console.warn('Boundary loading failed, continuing without boundaries:', error);
    });
    
    // Phase 1: Show ALIN splash screen for 4 seconds
    console.log('Starting splash screen sequence...');
    setTimeout(() => {
        console.log('Phase 1: Fading out splash screen...');
        splashScreen.style.animation = 'splashFadeOut 1s ease-out forwards';
        
        // Phase 2: Show Nepal map with statistics overlay
        setTimeout(() => {
            console.log('Phase 2: Showing statistics overlay...');
            splashScreen.style.display = 'none';
            statsOverlay.style.display = 'flex';
            
            // Start the video sequence (waits for user input) - no Nepal highlighting
            console.log('Starting video sequence...');
            startVideoSequence();
            
        }, 1000);
    }, 4000);
});

// Modal elements
const modal = document.getElementById('popup-modal');
const closeBtn = document.querySelector('.close');

// Function to open Shop popup
function openShopPopup() {
    // Hide navbar
    hideNavbar();
    
    document.getElementById('popup-title').textContent = 'Kirna Shop';
    
    // Update location information  
    document.getElementById('location-name').textContent = 'Barsha Pokharel';
    document.getElementById('interview-count').textContent = 'Grocery Shop Owner';
    
    // Update access level badge
    const accessBadge = document.getElementById('access-badge');
    accessBadge.textContent = 'MEDIUM ACCESS';
    accessBadge.className = 'badge medium-access';
    
    // Show resident content, hide foundation content
    document.getElementById('resident-content').style.display = 'block';
    document.getElementById('foundation-content').style.display = 'none';
    document.getElementById('resident-stats').style.display = 'block';
    
    // 🎥 SHOWCASE VIDEO: Barsha's banking video
    document.querySelector('.showcase-video-section').style.display = 'block';
    document.getElementById('showcase-video-heading').textContent = '🎥 On Not Using Online Banking and Wallets';
    
    const showcaseVideoContainer = document.querySelector('.showcase-video-container');
    showcaseVideoContainer.innerHTML = `
        <iframe src="https://drive.google.com/file/d/1UulOKF5g4sKxMJ_uZwK0Jw23OnyiO2gn/preview" 
                width="100%" height="350" frameborder="0" allow="autoplay">
        </iframe>
    `;

    // Update profile section
    document.getElementById('resident-headshot').src = 'interviews/Local shop/Barsha_Pokharel.png';
    document.getElementById('resident-name').textContent = 'Barsha Pokharel';
    document.getElementById('resident-role').textContent = 'Grocery Shop Owner (33 years old)';
    document.getElementById('resident-description').textContent = '33-year-old grocery shop owner near Buspark. Lives with extended family including mother-in-law, father-in-law, 10-year-old son, and sister-in-law. Uses phone all day in shop - mainly TikTok and business videos.';
    
    // Update quotes with Barsha's real perspectives
    document.getElementById('quote-1').textContent = '"I use phone whole day in the shop. I feel bored when it doesn\'t work because I have to do time pass here and if it doesn\'t work, I feel so bored."';
    document.getElementById('quote-2').textContent = '"In this generation children are so difficult to handle. There is a fear - if we refuse to give them phones, they might take negative decisions. Various incidents happened due to refusing phones, they do suicide. That\'s why we\'re scared and have to act softly."';
    document.getElementById('quote-3').textContent = '"It takes time for 10, 20 rupees to collect online, but if we have cash, we can buy things easily. That\'s why I don\'t use online payments."';
    
    // Hide photo elements for cleaner quote-only design
    document.getElementById('photo-1').style.display = 'none';
    document.getElementById('photo-2').style.display = 'none';
    document.getElementById('photo-3').style.display = 'none';
    
    // Show second video section with Barsha's concerns video
    document.getElementById('video-2-section').style.display = 'block';
    document.getElementById('video-2-heading').textContent = '🎥 Concerns on Mobile Use by Children';
    document.getElementById('second-video').src = 'https://drive.google.com/file/d/1G-L2Tvvz0UHGadU9MQisKoBd9kAJNpgH/preview';
    
    // Hide first and third video sections (showcase video covers the first one)
    document.querySelector('.video-section').style.display = 'none';
    document.getElementById('video-3-section').style.display = 'none';
    
    // Hide statistics section for Kirna Shop
    document.getElementById('resident-stats').style.display = 'none';
    
    modal.style.display = 'block';
    modal.classList.add('show');
    document.getElementById('map').classList.add('map-with-panel');
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

// Function to open Street Interview popup
function openStreetInterviewPopup(location) {
    // Hide navbar
    hideNavbar();
    
    // Update title - special cases for specific participants
    if (location.name === 'Street Interview 3') {
        document.getElementById('popup-title').textContent = 'Street Interview - Maili Tamang';
    } else if (location.name === 'Street Interview 2') {
        document.getElementById('popup-title').textContent = 'Street Interview - Bijay Tamang';
    } else {
        document.getElementById('popup-title').textContent = `${location.name} - Street Interview`;
    }
    
    // Update location information  
    document.getElementById('location-name').textContent = 'Public Space Interview';
    document.getElementById('interview-count').textContent = 'Street-level Perspectives';
    
    // Update access level badge
    const accessBadge = document.getElementById('access-badge');
    accessBadge.textContent = 'INTERVIEW';
    accessBadge.className = 'badge interview-access';
    
    // Show resident content, hide foundation content
    document.getElementById('resident-content').style.display = 'block';
    document.getElementById('foundation-content').style.display = 'none';
    document.getElementById('resident-stats').style.display = 'block';
    
    // Update profile section - check for specific participants
    if (location.name === 'Street Interview 3') {
        document.getElementById('resident-headshot').src = 'interviews/street interview/street interview 3/Maili Tamang.JPG';
        document.getElementById('resident-name').textContent = 'Maili Tamang';
        document.getElementById('resident-role').textContent = '58-year-old widow from Majhuwa';
        document.getElementById('resident-description').textContent = 'Lives contentedly without smartphones - believes she\'s past the age for learning new technology but is at peace with traditional methods.';
    } else if (location.name === 'Street Interview 2') {
        document.getElementById('resident-headshot').src = 'photos/headshots/Bijay_tamang.png';
        document.getElementById('resident-name').textContent = 'Bijay Tamang';
        document.getElementById('resident-role').textContent = '17-year-old college student';
        document.getElementById('resident-description').textContent = '17-year-old college student living with parents and younger sister (9-10). Only he and father regularly use mobile phones. Area has decent wifi coverage with about 50% of homes connected. Experienced online scam losing 8-11k rupees buying FreeFire gaming account.';
    } else {
        document.getElementById('resident-headshot').src = 'https://via.placeholder.com/120x120/6366f1/ffffff?text=🎤';
        document.getElementById('resident-name').textContent = 'Samjhana Lama';
        document.getElementById('resident-role').textContent = 'Street Interview Participants';
        document.getElementById('resident-description').textContent = 'Street-level conversations capture spontaneous insights about digital access, mobile data usage, and how people navigate digital services while moving through their community.';
    }
    
    // Update photo collage
    document.getElementById('photo-1').src = 'https://via.placeholder.com/400x200/f1f5f9/64748b?text=Traditional+Life+in+Majhuwa';
    document.getElementById('photo-2').src = 'https://via.placeholder.com/400x200/f1f5f9/64748b?text=Generational+Perspectives';
    document.getElementById('photo-3').src = 'https://via.placeholder.com/400x200/f1f5f9/64748b?text=Community+Values';
    
    // Update quotes and video based on location
    if (location.name === 'Street Interview 3') {
        document.getElementById('quote-1').textContent = '"I\'ve gotten old. Half of my life has already passed. What\'s the use for me now? I\'m at peace without it."';
        document.getElementById('quote-2').textContent = '"We had nothing like this in our time. Now even small kids have mobile phones. I don\'t even know how to say \'hello\' on one."';
        document.getElementById('quote-3').textContent = '"Mobile phones will ruin children. We shouldn\'t give them until age 20-22. There\'s nothing greater than education."';
        
        // 🎥 SHOWCASE VIDEO: Only for Maili Tamang - Put her video in the showcase section
        document.querySelector('.showcase-video-section').style.display = 'block';
        document.getElementById('showcase-video-heading').textContent = '🎥 Perception of Mobile Phones';
        
        // Create iframe in the showcase video container
        const showcaseVideoContainer = document.querySelector('.showcase-video-container');
        showcaseVideoContainer.innerHTML = `
            <iframe src="https://drive.google.com/file/d/1TtkMt7IbRgbdaof_zOenLbqyy5MuRDcg/preview" 
                    width="100%" 
                    height="350" 
                    frameborder="0" 
                    allow="autoplay"
                    style="border-radius: 8px;">
            </iframe>
        `;
        
        // Hide the old video section completely
        document.querySelector('.video-section').style.display = 'none';
    } else if (location.name === 'Street Interview 2') {
        document.getElementById('quote-1').textContent = '"I wake up and go to college, when I return back I use mobile for little bit and play some online games... I play Mobile Legends"';
        document.getElementById('quote-2').textContent = '"I am doubtful actually. I actually got scammed. Since then, I don\'t do it... I bought the ID but the seller changed the passcode"';
        document.getElementById('quote-3').textContent = '"It\'s not like that.. they sometimes use the mobile phone... [Sister] just watches TikToks... [Father] didn\'t agree to learn [online banking]"';
        
        // Update quote themes for Bijay's content
        document.querySelector('.quote-item:nth-child(1) .quote-theme').textContent = 'Gaming & Digital Life';
        document.querySelector('.quote-item:nth-child(2) .quote-theme').textContent = 'Trust & Online Safety';
        document.querySelector('.quote-item:nth-child(3) .quote-theme').textContent = 'Family Digital Divide';
        
        // Update quote icons to match Bijay's themes
        document.querySelector('.quote-item:nth-child(1) .quote-icon').textContent = '🎮';
        document.querySelector('.quote-item:nth-child(2) .quote-icon').textContent = '🔒';
        document.querySelector('.quote-item:nth-child(3) .quote-icon').textContent = '👨‍👩‍👧‍👦';
        
        // 🎥 SHOWCASE VIDEO: Bijay's Mobile Gaming Scam Story
        document.querySelector('.showcase-video-section').style.display = 'block';
        document.getElementById('showcase-video-heading').textContent = '🎥 Mobile Gaming Scam Story';
        
        // Create iframe in the showcase video container
        const showcaseVideoContainer = document.querySelector('.showcase-video-container');
        showcaseVideoContainer.innerHTML = `
            <iframe src="https://drive.google.com/file/d/1m1Q8CPlbzHUyv51OKcLx2JLEASR1u1hQ/preview" 
                    width="100%" 
                    height="350" 
                    frameborder="0" 
                    allow="autoplay"
                    style="border-radius: 8px;">
            </iframe>
        `;
        
        // Hide the old video section completely
        document.querySelector('.video-section').style.display = 'none';
    } else {
        // For other interviews - hide showcase video section
        document.querySelector('.showcase-video-section').style.display = 'none';
        
        document.getElementById('quote-1').textContent = '"Street interviews reveal the everyday challenges people face with digital services in public spaces."';
        document.getElementById('quote-2').textContent = '"Mobile data is expensive but necessary for staying connected while away from home."';
        document.getElementById('quote-3').textContent = '"Public wifi is unreliable, so we depend on our phone data plans."';
        
        document.getElementById('video-1-heading').textContent = '🎥 Street Conversations';
        document.getElementById('youtube-video').src = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    }
    
    // Hide second and third video sections (not needed for interviews)
    document.getElementById('video-2-section').style.display = 'none';
    document.getElementById('video-3-section').style.display = 'none';
    
    // Update statistics with interview data - special cases for participants
    if (location.name === 'Street Interview 3') {
        document.getElementById('internet-speed').textContent = 'N/A';
        document.getElementById('devices').textContent = 'none';
        document.getElementById('monthly-cost').textContent = 'N/A';
        document.getElementById('digital-skills').textContent = 'none';
        document.getElementById('online-services').textContent = 'none';
    } else if (location.name === 'Street Interview 2') {
        document.getElementById('internet-speed').textContent = 'Works properly for gaming (occasional ping issues)';
        document.getElementById('devices').textContent = 'Mobile phone (has damaged 2 from gaming anger)';
        document.getElementById('monthly-cost').textContent = 'Not specified';
        document.getElementById('digital-skills').textContent = 'Medium-Advanced (online banking, social media, gaming)';
        document.getElementById('online-services').textContent = 'Mobile Legends gaming, Instagram and Facebook, eSewa digital banking, TikTok (family sharing)';
    } else {
        document.getElementById('internet-speed').textContent = 'Mobile data dependent';
        document.getElementById('devices').textContent = 'Personal smartphones';
        document.getElementById('monthly-cost').textContent = 'Variable data plans';
        document.getElementById('digital-skills').textContent = 'Practical mobile skills';
        document.getElementById('online-services').textContent = 'On-the-go digital needs';
    }
    
    modal.style.display = 'block';
    modal.classList.add('show');
    document.getElementById('map').classList.add('map-with-panel');
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
    
    // Check if story mode is active and start viewing timer
    checkAndStartStoryModeViewing(location);
}

// Function to open Khajaghar popup
function openKhajagharPopup(location) {
    // Hide navbar
    hideNavbar();
    
    document.getElementById('popup-title').textContent = location.name;
    
    // Update location information  
    document.getElementById('location-name').textContent = 'Sunita Tamang';
    document.getElementById('interview-count').textContent = 'Shop Owner & selectively digital';
    
    // Update access level badge
    const accessBadge = document.getElementById('access-badge');
    accessBadge.textContent = 'HIGH ACCESS';
    accessBadge.className = 'badge high-access';
    
    // Show resident content, hide foundation content
    document.getElementById('resident-content').style.display = 'block';
    document.getElementById('foundation-content').style.display = 'none';
    document.getElementById('resident-stats').style.display = 'block';
    
    // Update profile section
    document.getElementById('resident-headshot').src = 'https://via.placeholder.com/120x120/dc2626/ffffff?text=☕';
    document.getElementById('resident-name').textContent = 'Tea Shop Owner';
    document.getElementById('resident-role').textContent = 'Community Hub Keeper';
    document.getElementById('resident-description').textContent = 'Traditional khajaghar serve as important social spaces where community members share information about digital services, help each other with online forms, and discuss the challenges of adapting to digital systems.';
    
    // Update photo collage
    document.getElementById('photo-1').src = 'https://via.placeholder.com/400x200/f1f5f9/64748b?text=Tea+Shop+Gathering';
    document.getElementById('photo-2').src = 'https://via.placeholder.com/400x200/f1f5f9/64748b?text=Community+Discussions';
    document.getElementById('photo-3').src = 'https://via.placeholder.com/400x200/f1f5f9/64748b?text=Digital+Help';
    
    document.getElementById('quote-1').textContent = '"The khajaghar is where people come to discuss everything - from local news to digital services."';
    document.getElementById('quote-2').textContent = '"Customers often help each other with smartphone apps over tea."';
    document.getElementById('quote-3').textContent = '"We share knowledge about online forms and digital payments here."';
    
    // Check if this is Thaple Khajaghar (formerly Khajaghar 2) or Majuwa Khajaghar
    if (location.name === "Khajaghar 2" || location.name === "Thaple Khajaghar") {
        // Thaple Khajaghar - Aman Tamang (Grade 12 Hotel Management student)
        document.getElementById('resident-headshot').src = 'photos/headshots/Aman Tamang.png';
        document.getElementById('resident-name').textContent = 'Aman Tamang';
        document.getElementById('resident-role').textContent = 'Grade 12 Hotel Management Student';
        document.getElementById('resident-description').textContent = 'Grade 12 Hotel Management student living with parents and sister. Family runs shop/restaurant business with eSewa payments. Heavy daily phone user starting 4:45am, extensive gaming during college breaks and after school.';
        
        // Update quotes from Aman's real content
        document.getElementById('quote-1').textContent = '"I give a lot of my time to phone... In lunch break, we don\'t actually eat lunch but play mobile phones... if battery is low, I play it while charging"';
        document.getElementById('quote-2').textContent = '"I think we learn more from smartboard... They show videos. They show exercise from youtube... We can find books there as well. We don\'t have to carry one"';
        document.getElementById('quote-3').textContent = '"I have 3 facebook id... One for school like school groups, one for friends and one for personal... It\'s only me. I don\'t think they have lots of ids"';
        
        // Update quote themes for Aman's content
        document.querySelector('.quote-item:nth-child(1) .quote-theme').textContent = 'Intensive Gaming Lifestyle';
        document.querySelector('.quote-item:nth-child(2) .quote-theme').textContent = 'Educational Technology';
        document.querySelector('.quote-item:nth-child(3) .quote-theme').textContent = 'Digital Identity Management';
        
        // Update quote icons to match Aman's themes
        document.querySelector('.quote-item:nth-child(1) .quote-icon').textContent = '🎮';
        document.querySelector('.quote-item:nth-child(2) .quote-icon').textContent = '📱';
        document.querySelector('.quote-item:nth-child(3) .quote-icon').textContent = '🔄';
        
        // 🎥 SHOWCASE VIDEO: Aman's Value of Internet in daily life
        document.querySelector('.showcase-video-section').style.display = 'block';
        document.getElementById('showcase-video-heading').textContent = '🎥 Value of Internet in Daily Life';
        
        // Create iframe in the showcase video container
        const showcaseVideoContainer = document.querySelector('.showcase-video-container');
        showcaseVideoContainer.innerHTML = `
            <iframe src="https://drive.google.com/file/d/1hLANscn_QwqB7kikdPvgiBnBowQRBiYf/preview" 
                    width="100%" 
                    height="350" 
                    frameborder="0" 
                    allow="autoplay"
                    style="border-radius: 8px;">
            </iframe>
        `;
        
        // Show second video section
        document.getElementById('video-2-section').style.display = 'block';
        document.getElementById('video-2-heading').textContent = '🎥 Use of Internet in Learning';
        document.getElementById('second-video').src = 'https://drive.google.com/file/d/1AtMPVtt5veyhsd_PKRIl9ruxG7pzGo7n/preview';
        
        // Hide first and third video sections (showcase video covers the main content)
        document.querySelector('.video-section').style.display = 'none';
        document.getElementById('video-3-section').style.display = 'none';
    } else {
        // Majuwa Khajaghar - Sunita Tamang (Shop Owner & Lifelong Learner)
        document.getElementById('resident-name').textContent = 'Sunita Tamang';
        document.getElementById('resident-role').textContent = 'Shop Owner & Lifelong Learner';
        document.getElementById('resident-description').textContent = 'Shop owner, studied till 4-5th grade. Lives with extended family including young grandson. Uses phone 1-2 hours daily for leisure - watches TikTok and Facebook but doesn\'t create content.';
        
        // 🎥 SHOWCASE VIDEO: Sunita's Google Drive link
        document.querySelector('.showcase-video-section').style.display = 'block';
        document.getElementById('showcase-video-heading').textContent = '🎥 Digital Learning at Any Age';
        
        const showcaseVideoContainer = document.querySelector('.showcase-video-container');
        showcaseVideoContainer.innerHTML = `
            <iframe src="https://drive.google.com/file/d/1Gb3JR_vFlNlu2d8mmnU9gd9kr89JoK8C/preview" 
                    width="100%" height="350" frameborder="0" allow="autoplay">
            </iframe>
        `;

        // Update headshot
        document.getElementById('resident-headshot').src = 'interviews/khajaghar/khajaghar 1/Sunita Tamang.JPG';
        
        // Update quotes from Sunita's real content
        document.getElementById('quote-1').textContent = '"I don\'t know how to use much... When I can\'t figure something out, I just leave it. But I try to learn as I go."';
        document.getElementById('quote-2').textContent = '"They play FreeFire a lot... I fear my grandson will fall into that company too. But what can we do - that\'s how the world is these days."';
        document.getElementById('quote-3').textContent = '"Despite my age, I like to learn as it\'ll help me one day. People my age don\'t usually do this, but I joined Tibetan classes because we use it in all our rituals."';
        
        // Hide all video sections for Majuwa Khajaghar (only showcase video at top)
        document.querySelector('.video-section').style.display = 'none';
        document.getElementById('video-2-section').style.display = 'none';
        document.getElementById('video-3-section').style.display = 'none';
    }
    
    // Update statistics - use Aman's real data for Thaple Khajaghar, Sunita's for Majuwa
    if (location.name === "Khajaghar 2" || location.name === "Thaple Khajaghar") {
        document.getElementById('internet-speed').textContent = 'Works properly (wifi for business), NTC mobile data reliable, Ncell only works on hills';
        document.getElementById('devices').textContent = 'Smartphone (not gaming-specific but used heavily for games)';
        document.getElementById('monthly-cost').textContent = 'Not specified (business wifi)';
        document.getElementById('digital-skills').textContent = 'Medium-Advanced (gaming, social media, educational apps, eSewa, multiple accounts)';
        document.getElementById('online-services').textContent = 'FreeFire gaming and top-ups, YouTube educational content, Facebook (3 accounts), TikTok, Instagram, Snapchat, eSewa business payments';
    } else {
        // Sunita Tamang's statistics
        document.getElementById('internet-speed').textContent = '350 Mbps';
        document.getElementById('devices').textContent = 'Personal smartphone, family smartphones';
        document.getElementById('monthly-cost').textContent = 'N/A';
        document.getElementById('digital-skills').textContent = 'Basic use';
        document.getElementById('online-services').textContent = 'WhatsApp (Tibetan language classes), Tiktok and Facebook';
    }
    
    modal.style.display = 'block';
    modal.classList.add('show');
    document.getElementById('map').classList.add('map-with-panel');
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
    
    // Check if story mode is active and start viewing timer
    checkAndStartStoryModeViewing(location);
}

// Function to open School popup
function openSchoolPopup() {
    // Hide navbar
    hideNavbar();
    
    document.getElementById('popup-title').textContent = 'Majuwa Adharbhut Vidyalaya';
    
    // Update location information  
    document.getElementById('location-name').textContent = 'Shyam Krishna Bhattarai';
    document.getElementById('interview-count').textContent = 'School Principal';
    
    // Update access level badge
    const accessBadge = document.getElementById('access-badge');
    accessBadge.textContent = 'MEDIUM ACCESS';
    accessBadge.className = 'badge medium-access';
    
    // Show resident content, hide foundation content
    document.getElementById('resident-content').style.display = 'block';
    document.getElementById('foundation-content').style.display = 'none';
    document.getElementById('resident-stats').style.display = 'block';
    
    // 🎥 SHOWCASE VIDEO: Principal's Analysis video
    document.querySelector('.showcase-video-section').style.display = 'block';
    document.getElementById('showcase-video-heading').textContent = '🎥 Analysis of Technology Use in Majuwa';
    
    const showcaseVideoContainer = document.querySelector('.showcase-video-container');
    showcaseVideoContainer.innerHTML = `
        <iframe src="https://drive.google.com/file/d/1zT7sWLhgh04hFKervNl-XXM05D327a62/preview" 
                width="100%" height="350" frameborder="0" allow="autoplay">
        </iframe>
    `;

    // Update profile section
    document.getElementById('resident-headshot').src = 'interviews/principal/Shyam Krishna Bhattarai (HT).png';
    document.getElementById('resident-name').textContent = 'Shyam Krishna Bhattarai';
    document.getElementById('resident-role').textContent = 'School Principal';
    document.getElementById('resident-description').textContent = 'School principal who first experienced mobile phones at age 40. Represents late digital adopters who learned technology out of necessity and now advocates for gradual, patient digital learning approaches.';
    
    // Update quotes with principal's perspectives (text only)
    document.getElementById('quote-1').textContent = '"My first exposure to mobile phone was at 40, and I felt that fear too. I still do not use a calculator. I prefer pen and paper. For me, it feels faster and more natural"';
    document.getElementById('quote-2').textContent = '"When you are a kid, you don\'t care if your mobile phone breaks. As you get older, you begin to fear what might happen if it breaks. It is like learning to ride a bicycle. A child is open to trying, but at 25, you are more afraid."';
    document.getElementById('quote-3').textContent = '"Technology should serve education, not replace the fundamentals of learning. We must find balance."';
    
    // Hide photo elements for cleaner quote-only design
    document.getElementById('photo-1').style.display = 'none';
    document.getElementById('photo-2').style.display = 'none';
    document.getElementById('photo-3').style.display = 'none';
    
    // Show second video section with Government's role video
    document.getElementById('video-2-section').style.display = 'block';
    document.getElementById('video-2-heading').textContent = '🎥 On Government\'s Role on Increasing Digital Literacy';
    document.getElementById('second-video').src = 'https://drive.google.com/file/d/1SdOqhntIZ9mNKYQdcfT3A7TbUyR-UOeE/preview';
    
    // Hide first and third video sections (showcase video covers the first one)
    document.querySelector('.video-section').style.display = 'none';
    document.getElementById('video-3-section').style.display = 'none';
    
    // Show statistics section for principal
    document.getElementById('resident-stats').style.display = 'block';
    
    // Update statistics with principal's data
    document.getElementById('internet-speed').textContent = 'School WiFi + Personal mobile data';
    document.getElementById('devices').textContent = 'School computers, personal smartphone';
    document.getElementById('monthly-cost').textContent = 'Institutional internet';
    document.getElementById('digital-skills').textContent = 'Late adopter, cautious learner';
    document.getElementById('online-services').textContent = 'Educational tools, basic communication';
    
    modal.style.display = 'block';
    modal.classList.add('show');
    document.getElementById('map').classList.add('map-with-panel');
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

// Function to open Ward Office popup
function openWardOfficePopup() {
    // Hide navbar
    hideNavbar();
    
    document.getElementById('popup-title').textContent = 'Nagarjun Municipality Ward 8 Office';
    
    // Update location information  
    document.getElementById('location-name').textContent = 'Suraj Kumar Pokharel';
    document.getElementById('interview-count').textContent = 'Ward Chairperson';
    
    // Update access level badge
    const accessBadge = document.getElementById('access-badge');
    accessBadge.textContent = 'HIGH ACCESS';
    accessBadge.className = 'badge high-access';
    
    // Show resident content, hide foundation content
    document.getElementById('resident-content').style.display = 'block';
    document.getElementById('foundation-content').style.display = 'none';
    document.getElementById('resident-stats').style.display = 'block';
    
    // 🎥 SHOWCASE VIDEO: Ward Introduction
    document.querySelector('.showcase-video-section').style.display = 'block';
    document.getElementById('showcase-video-heading').textContent = '🎥 Introduction of Ward';
    
    const showcaseVideoContainer = document.querySelector('.showcase-video-container');
    showcaseVideoContainer.innerHTML = `
        <iframe src="https://drive.google.com/file/d/1W7D1_DSX2qeqQhcivB9I0jnAbOaIsMxt/preview" 
                width="100%" height="350" frameborder="0" allow="autoplay">
        </iframe>
    `;

    // Update profile section
    document.getElementById('resident-headshot').src = 'interviews/ward office/ward_chait.jpg';
    document.getElementById('resident-name').textContent = 'Suraj Kumar Pokharel';
    document.getElementById('resident-role').textContent = 'Ward Chairperson';
    document.getElementById('resident-description').textContent = 'Ward Chairperson of Bhimdhunga, Ward 8 of Nagarjun Municipality - 13km west of central Kathmandu. Leads governance of a peri-urban transition zone with three distinct communities: Majhuwa, Thaple, and Bus Park area.';
    
    // Update quotes with ward/community perspectives and fix quote themes
    document.getElementById('quote-1').textContent = '"Bhimdhunga represents the peri-urban transition zone - caught between traditional rural life and urban connectivity, creating unique digital adoption patterns."';
    document.getElementById('quote-2').textContent = '"Digital engagement varies dramatically by generation - from elderly non-users to youth heavily involved in mobile gaming, creating age-based digital divides within the same households."';
    document.getElementById('quote-3').textContent = '"Most residents rely on semi-subsistence farming with few formal employment opportunities, influencing their approach to digital technology adoption."';
    
    // Update quote themes to match content
    document.querySelector('.quote-item:nth-child(1) .quote-theme').textContent = 'Geographic Context';
    document.querySelector('.quote-item:nth-child(2) .quote-theme').textContent = 'Generational Gaps';
    document.querySelector('.quote-item:nth-child(3) .quote-theme').textContent = 'Lifestyle & Economics';
    
    // Update quote icons to match themes
    document.querySelector('.quote-item:nth-child(1) .quote-icon').textContent = '🗺️';
    document.querySelector('.quote-item:nth-child(2) .quote-icon').textContent = '👨‍👩‍👧‍👦';
    document.querySelector('.quote-item:nth-child(3) .quote-icon').textContent = '🌾';
    
    // Hide photo elements for cleaner quote-only design
    document.getElementById('photo-1').style.display = 'none';
    document.getElementById('photo-2').style.display = 'none';
    document.getElementById('photo-3').style.display = 'none';
    
    // Show second video section with Q&A
    document.getElementById('video-2-section').style.display = 'block';
    document.getElementById('video-2-heading').textContent = '🎥 Q&A with Ward Chairperson';
    document.getElementById('second-video').src = 'https://drive.google.com/file/d/1Xaoxp4RjZSGPrWdDEGH2kR3u2YQEW5C6/preview';
    
    // Hide first and third video sections (showcase video covers the first one)
    document.querySelector('.video-section').style.display = 'none';
    document.getElementById('video-3-section').style.display = 'none';
    
    // Hide statistics section for ward office
    document.getElementById('resident-stats').style.display = 'none';
    
    modal.style.display = 'block';
    modal.classList.add('show');
    document.getElementById('map').classList.add('map-with-panel');
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

// Function to hide/show navbar
function hideNavbar() {
    const navbar = document.getElementById('navbar');
    navbar.classList.add('hidden');
}

function showNavbar() {
    const navbar = document.getElementById('navbar');
    navbar.classList.remove('hidden');
}

// Function to open popup with digital divide story
function openPopup(house) {
    document.getElementById('popup-title').textContent = house.title;
    
    // Update location information
    document.getElementById('location-name').textContent = house.locationName || '';
    document.getElementById('interview-count').textContent = house.interviewCount || '';
    
    // Update access level badge
    const accessBadge = document.getElementById('access-badge');
    const accessLevel = house.digitalAccess;
    accessBadge.textContent = `${accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1)} access`;
    accessBadge.className = `badge ${house.digitalAccess}-access`;
    
    // Hide navbar when panel opens
    hideNavbar();
    
    // Check if this is a foundation house
    if (house.isFoundation) {
        openFoundationPopup(house);
        return;
    }
    
    // Show resident content, hide foundation content
    document.getElementById('resident-content').style.display = 'block';
    document.getElementById('foundation-content').style.display = 'none';
    document.getElementById('resident-stats').style.display = 'block';
    
    // Update profile section
    document.getElementById('resident-headshot').src = house.profile?.headshot || 'https://via.placeholder.com/120x120/e2e8f0/64748b?text=Photo';
    document.getElementById('resident-name').textContent = house.story.resident || 'Resident Name';
    document.getElementById('resident-role').textContent = house.profile?.role || 'Community Member';
    document.getElementById('resident-description').textContent = house.profile?.description || house.story.testimonial || '[Profile description to be added]';
    
    // Update photo collage
    document.getElementById('photo-1').src = house.photos?.[0]?.image || 'https://via.placeholder.com/400x200/f1f5f9/64748b?text=Daily+Life+Photo';
    document.getElementById('photo-2').src = house.photos?.[1]?.image || 'https://via.placeholder.com/400x200/f1f5f9/64748b?text=Technology+Photo';
    document.getElementById('photo-3').src = house.photos?.[2]?.image || 'https://via.placeholder.com/400x200/f1f5f9/64748b?text=Community+Photo';
    
    document.getElementById('quote-1').textContent = house.photos?.[0]?.quote || house.story.quote || '"Living between tradition and technology"';
    document.getElementById('quote-2').textContent = house.photos?.[1]?.quote || '"Digital tools change how we work and learn"';
    document.getElementById('quote-3').textContent = house.photos?.[2]?.quote || '"Our community helps each other adapt"';
    
    // Update quote themes and icons for specific households
    if (house.title === "Extended Family Home") {
        // Update quote themes to match Sikha's content
        document.querySelector('.quote-item:nth-child(1) .quote-theme').textContent = 'Online Shopping & Trust';
        document.querySelector('.quote-item:nth-child(2) .quote-theme').textContent = 'Family Digital Teaching';
        document.querySelector('.quote-item:nth-child(3) .quote-theme').textContent = 'Digital Agriculture';
        
        // Update quote icons to match themes
        document.querySelector('.quote-item:nth-child(1) .quote-icon').textContent = '🛒';
        document.querySelector('.quote-item:nth-child(2) .quote-icon').textContent = '👨‍👩‍👧‍👦';
        document.querySelector('.quote-item:nth-child(3) .quote-icon').textContent = '🌱';
    } else if (house.title === "Farming Crew Household") {
        // Update quote themes to match Dhan Bahadur's content
        document.querySelector('.quote-item:nth-child(1) .quote-theme').textContent = 'Learning Approach';
        document.querySelector('.quote-item:nth-child(2) .quote-theme').textContent = 'News & Information';
        document.querySelector('.quote-item:nth-child(3) .quote-theme').textContent = 'Daily Usage Pattern';
        
        // Update quote icons to match themes
        document.querySelector('.quote-item:nth-child(1) .quote-icon').textContent = '📚';
        document.querySelector('.quote-item:nth-child(2) .quote-icon').textContent = '📺';
        document.querySelector('.quote-item:nth-child(3) .quote-icon').textContent = '⏰';
    }
    
    // Handle video sections - hide for Extended Family Home and Farming Crew Household
    if (house.title === "Extended Family Home" || house.title === "Farming Crew Household") {
        // Hide all video sections for Extended Family Home
        document.querySelector('.video-section').style.display = 'none';
        document.getElementById('video-2-section').style.display = 'none';
        document.getElementById('video-3-section').style.display = 'none';
        // Also hide showcase video section
        document.querySelector('.showcase-video-section').style.display = 'none';
    } else {
        // Show video for other houses
        document.getElementById('video-1-heading').textContent = '🎥 Their Story';
        const youtubeId = house.youtubeId || 'dQw4w9WgXcQ'; // Default placeholder
        document.getElementById('youtube-video').src = `https://www.youtube.com/embed/${youtubeId}`;
        
        // Hide second and third video sections for household stories
        document.getElementById('video-2-section').style.display = 'none';
        document.getElementById('video-3-section').style.display = 'none';
    }
    
    // Update digital statistics
    document.getElementById('internet-speed').textContent = house.stats.internetSpeed || 'TBD';
    document.getElementById('devices').textContent = house.stats.devices || 'TBD';
    document.getElementById('monthly-cost').textContent = house.stats.monthlyDataCost || 'TBD';
    document.getElementById('digital-skills').textContent = house.stats.digitalSkills || 'TBD';
    document.getElementById('online-services').textContent = house.stats.onlineServices || 'TBD';
    
    modal.style.display = 'block';
    modal.classList.add('show');
    document.getElementById('map').classList.add('map-with-panel');
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

// Function to handle foundation-specific popup content
function openFoundationPopup(house) {
    const foundation = house.foundation;
    
    // Hide resident content, show foundation content
    document.getElementById('resident-content').style.display = 'none';
    document.getElementById('foundation-content').style.display = 'block';
    document.getElementById('resident-stats').style.display = 'none';
    
    // Update foundation header
    document.getElementById('foundation-logo').src = foundation.logo;
    document.getElementById('foundation-name').textContent = foundation.name;
    document.getElementById('foundation-mission').textContent = foundation.mission;
    document.getElementById('foundation-description').textContent = foundation.description;
    
    // Show single team photo
    const teamGrid = document.getElementById('team-grid');
    teamGrid.innerHTML = '';
    const teamPhotoDiv = document.createElement('div');
    teamPhotoDiv.className = 'team-photo-container';
    teamPhotoDiv.innerHTML = `
        <img src="photos/team_members.jpg" alt="Fellowship Team" class="team-group-photo">
        <p class="team-caption">All In Foundation Fellowship Research Team</p>
    `;
    teamGrid.appendChild(teamPhotoDiv);
    
    // Populate FAQ list
    const faqList = document.getElementById('faq-list');
    faqList.innerHTML = '';
    foundation.faq.forEach(item => {
        const faqDiv = document.createElement('div');
        faqDiv.className = 'faq-item';
        faqDiv.innerHTML = `
            <div class="faq-question">
                <h4>${item.question}</h4>
                <span class="faq-toggle">+</span>
            </div>
            <div class="faq-answer">
                <p>${item.answer}</p>
            </div>
        `;
        
        // Add click handler for FAQ toggle
        const questionDiv = faqDiv.querySelector('.faq-question');
        const answerDiv = faqDiv.querySelector('.faq-answer');
        const toggle = faqDiv.querySelector('.faq-toggle');
        
        questionDiv.addEventListener('click', () => {
            if (answerDiv.style.display === 'block') {
                answerDiv.style.display = 'none';
                toggle.textContent = '+';
            } else {
                answerDiv.style.display = 'block';
                toggle.textContent = '−';
            }
        });
        
        faqList.appendChild(faqDiv);
    });
    
    // Populate projects grid
    const projectsGrid = document.getElementById('projects-grid');
    projectsGrid.innerHTML = '';
    foundation.fellowshipProjects.forEach(project => {
        const projectDiv = document.createElement('div');
        projectDiv.className = 'project-item';
        projectDiv.innerHTML = `
            <h4 class="project-title">${project.title}</h4>
            <p class="project-description">${project.description}</p>
            <div class="project-footer">
                <span class="project-status">${project.status}</span>
                <a href="${project.link}" class="project-link">Learn More →</a>
            </div>
        `;
        projectsGrid.appendChild(projectDiv);
    });
    
    modal.style.display = 'block';
    modal.classList.add('show');
    document.getElementById('map').classList.add('map-with-panel');
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

// Close modal when clicking X
closeBtn.onclick = function() {
    modal.classList.remove('show');
    document.getElementById('map').classList.remove('map-with-panel');
    setTimeout(() => {
        modal.style.display = 'none';
        map.invalidateSize();
    }, 300);
    // Stop YouTube video by clearing the src
    document.getElementById('youtube-video').src = '';
    document.getElementById('popup-audio').pause();
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target == modal) {
        modal.classList.remove('show');
        document.getElementById('map').classList.remove('map-with-panel');
        
        // Show navbar again
        showNavbar();
        
        // Hide custom content
        const customContent = document.getElementById('custom-content');
        if (customContent) {
            customContent.style.display = 'none';
        }
        
        // Show access badge again
        document.querySelector('.access-indicator').style.display = 'flex';
        
        // Clear active nav button
        clearActiveNavButton();
        
        setTimeout(() => {
            modal.style.display = 'none';
            map.invalidateSize();
        }, 300);
        document.getElementById('youtube-video').src = '';
        document.getElementById('popup-audio').pause();
    }
}

// Navigation bar functionality
document.addEventListener('DOMContentLoaded', function() {
    // FAQ button - opens ALIN Foundation panel
    document.getElementById('nav-faq').addEventListener('click', function() {
        if (foundationHouse) {
            // Move map to show ALIN foundation building
            map.setView([foundationHouse.lat, foundationHouse.lng], 16);
            // Open the foundation panel after a short delay for smooth transition
            setTimeout(() => {
                openPopup(foundationHouse);
                setActiveNavButton('nav-faq');
            }, 300);
        }
    });

    // About button - opens about panel
    document.getElementById('nav-about').addEventListener('click', function() {
        openAboutPanel();
        setActiveNavButton('nav-about');
    });

    // Stories button - shows stories overview
    document.getElementById('nav-stories').addEventListener('click', function() {
        openStoriesPanel();
        setActiveNavButton('nav-stories');
    });

    // Statistics button - shows aggregated data
    document.getElementById('nav-statistics').addEventListener('click', function() {
        openStatisticsPanel();
        setActiveNavButton('nav-statistics');
    });

    // Map Legend button - shows legend
    document.getElementById('nav-legend').addEventListener('click', function() {
        openLegendPanel();
        setActiveNavButton('nav-legend');
    });

    // Reset View button - resets map view
    document.getElementById('nav-reset').addEventListener('click', function() {
        resetMapView();
        clearActiveNavButton();
    });
    
    // Initialize progression controls (delay to avoid splash screen conflicts)
    setTimeout(() => {
        initializeProgressionControls();
    }, 100);
});

// Helper function to set active navigation button
function setActiveNavButton(buttonId) {
    // Remove active class from all buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    // Add active class to clicked button
    document.getElementById(buttonId).classList.add('active');
}

// Helper function to clear active navigation button
function clearActiveNavButton() {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
}

// Reset map view function
function resetMapView() {
    map.setView([27.733, 85.240], 15);
    // Close any open modals
    if (modal.classList.contains('show')) {
        closeBtn.onclick();
    }
}

// About panel function
function openAboutPanel() {
    // Create about content
    const aboutContent = {
        title: "About This Project",
        isCustomPanel: true,
        content: {
            header: {
                title: "Digital Divide Research in Bhimdhunga",
                subtitle: "Understanding lived experiences behind statistics"
            },
            sections: [
                {
                    title: "Project Overview",
                    content: "This interactive story map explores the digital divide across three communities in Bhimdhunga: Majhuwa, Thaple, and the Buspark area, located in Nagarjun Municipality Ward 8. Rather than presenting statistics alone, we showcase lived experiences of digital access through household interviews and video testimonials, revealing the human emotions and practical challenges behind the numbers."
                },
                {
                    title: "Research Objectives",
                    content: "• Document lived experiences of digital self-efficacy and educational access barriers among Bhimdhunga residents<br><br>• Capture community perspectives on digital engagement challenges to inform evidence-based digital inclusion policies in rural Nepal<br><br>• Bridge academic research and public understanding through an interactive platform that makes digital divide realities accessible to diverse audiences"
                },
                {
                    title: "Methodology", 
                    content: "Our team carried out four days of fieldwork (July 26, 29, 30, and 31, 2025) with 19 participants from various strata, following household interviews, spatial documentation of participant locations. This approach gathers community perspectives on digital engagement, education, and self-efficacy, as well as evidence-based suggestions for future digital inclusion policies in rural Nepal. The findings are presented through an interactive media platform that combines story maps, video testimonials, and immersive narratives to make digital divide realities more accessible to a wider audience."
                },
                {
                    title: "Key Themes",
                    content: "The research reveals critical patterns around <b>generational digital divides</b> (from elderly complete non-users to youth absorbed in mobile gaming), <b>urban-rural connectivity tensions </b>(proximity to Kathmandu yet persistent access barriers), <b>educational technology gaps</b> (online learning challenges during COVID-19), and <b>economic barriers to digital participation</b> (cost concerns and trust issues with digital financial services)."
                }
            ]
        }
    };
    
    openCustomPanel(aboutContent);
}

// Stories overview panel
function openStoriesPanel() {
    const storiesContent = {
        title: "Digital Stories & Journey Modes",
        isCustomPanel: true,
        content: {
            header: {
                title: "Explore Digital Divide Stories",
                subtitle: "Choose how you want to experience the stories"
            },
            storyModes: true,
            houseList: houseData.filter(house => !house.isFoundation)
        }
    };
    
    openCustomPanel(storiesContent);
}

// Statistics panel
function openStatisticsPanel() {
    // Calculate aggregated statistics
    const houses = houseData.filter(house => !house.isFoundation);
    const highAccess = houses.filter(house => house.digitalAccess === 'high').length;
    const mediumAccess = houses.filter(house => house.digitalAccess === 'medium').length;
    const lowAccess = houses.filter(house => house.digitalAccess === 'low').length;
    
    const statsContent = {
        title: "Digital Access Statistics",
        isCustomPanel: true,
        content: {
            header: {
                title: "Aggregated Community Data",
                subtitle: "Statistical overview of digital access in Bhimdhunga"
            },
            stats: {
                highAccess: highAccess,
                mediumAccess: mediumAccess,
                lowAccess: lowAccess,
                total: houses.length
            }
        }
    };
    
    openCustomPanel(statsContent);
}

// Legend panel
function openLegendPanel() {
    const legendContent = {
        title: "Map Legend",
        isCustomPanel: true,
        content: {
            header: {
                title: "Map Symbols & Colors",
                subtitle: "Understanding the map interface"
            },
            legend: [
                { icon: "fa-house", color: "#22c55e", label: "High Digital Access", description: "Households with reliable internet and digital skills" },
                { icon: "fa-house", color: "#fbbf24", label: "Medium Digital Access", description: "Households with some digital access but facing barriers" },
                { icon: "fa-house", color: "#ef4444", label: "Low Digital Access", description: "Households with limited or no digital access" },
                { icon: "fa-location-dot", color: "#dc2626", label: "All In Foundation", description: "Research organization headquarters" },
                { icon: "fa-building", color: "#7c3aed", label: "Ward Office", description: "Government administrative center" },
                { icon: "fa-graduation-cap", color: "#3b82f6", label: "School", description: "Educational institution" },
                { icon: "fa-mug-hot", color: "#dc2626", label: "Khajaghar", description: "Traditional tea shops and community gathering places" },
                { icon: "fa-shop", color: "#ea580c", label: "Local Shop", description: "Commercial establishments" },
                { icon: "fa-comments", color: "#6366f1", label: "Street Interviews", description: "Public space interview locations" }
            ]
        }
    };
    
    openCustomPanel(legendContent);
}

// Generic function to open custom panels
function openCustomPanel(content) {
    // Hide navbar
    hideNavbar();
    
    // Hide resident and foundation content
    document.getElementById('resident-content').style.display = 'none';
    document.getElementById('foundation-content').style.display = 'none';
    document.getElementById('resident-stats').style.display = 'none';
    
    // Update modal title and basic info
    document.getElementById('popup-title').textContent = content.title;
    document.getElementById('location-name').textContent = content.content.header?.subtitle || '';
    document.getElementById('interview-count').textContent = '';
    
    // Hide access badge for custom panels
    document.querySelector('.access-indicator').style.display = 'none';
    
    // Create and show custom content
    let customContent = document.getElementById('custom-content');
    if (!customContent) {
        customContent = document.createElement('div');
        customContent.id = 'custom-content';
        customContent.className = 'custom-content';
        document.querySelector('.popup-body').appendChild(customContent);
    }
    
    customContent.style.display = 'block';
    
    // Generate content based on type
    if (content.content.sections) {
        // About panel
        customContent.innerHTML = `
            <div class="custom-header">
                <h3>${content.content.header.title}</h3>
                <p class="custom-subtitle">${content.content.header.subtitle}</p>
            </div>
            ${content.content.sections.map(section => `
                <div class="custom-section">
                    <h4>${section.title}</h4>
                    <p>${section.content}</p>
                </div>
            `).join('')}
        `;
    } else if (content.content.houseList) {
        // Stories panel
        if (content.content.storyModes) {
            // Show story modes with quotes only
            customContent.innerHTML = `
                <div class="custom-header">
                    <h3>${content.content.header.title}</h3>
                    <p class="custom-subtitle">${content.content.header.subtitle}</p>
                </div>
                
                <!-- Story Journey Modes -->
                <div class="story-modes-section">
                    <h4>🎯 Guided Story Journeys</h4>
                    <p class="modes-intro">Experience the digital divide through thematic lenses</p>
                    
                    <div class="story-mode-cards">
                        <div class="story-mode-card age-journey" onclick="startAgeBasedJourney()">
                            <div class="mode-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="mode-content">
                                <h3>🕰️ Age-Based Journey</h3>
                                <div class="mode-description">
                                    <p>Experience how digital adoption varies across generations, from elderly complete non-users to digital natives.</p>
                                </div>
                                <button class="mode-start-btn">Start Journey</button>
                            </div>
                        </div>
                        
                        <div class="story-mode-card efficacy-journey">
                            <div class="mode-icon">
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <div class="mode-content">
                                <h3>🎯 Self-Efficacy Journey</h3>
                                <div class="mode-description">
                                    <p>Explore how people's beliefs about their digital abilities shape their technology use and adaptation.</p>
                                </div>
                                <div class="work-in-progress">
                                    <i class="fas fa-tools"></i>
                                    <span>Work in Progress</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="story-mode-card covid-journey">
                            <div class="mode-icon">
                                <i class="fas fa-virus"></i>
                            </div>
                            <div class="mode-content">
                                <h3>🦠 Covid Disruption</h3>
                                <div class="mode-description">
                                    <p>Discover how the pandemic accelerated digital adoption and revealed new forms of digital inequality.</p>
                                </div>
                                <div class="work-in-progress">
                                    <i class="fas fa-tools"></i>
                                    <span>Work in Progress</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Manual Exploration Note -->
                <div class="manual-note-section">
                    <div class="manual-note">
                        <i class="fas fa-info-circle"></i>
                        <p>For manual exploration, simply click on any house marker directly on the map to read individual stories at your own pace.</p>
                    </div>
                </div>
            `;
        } else {
            // Original stories grid layout
            customContent.innerHTML = `
                <div class="custom-header">
                    <h3>${content.content.header.title}</h3>
                    <p class="custom-subtitle">${content.content.header.subtitle}</p>
                </div>
                <div class="stories-grid">
                    ${content.content.houseList.map(house => `
                        <div class="story-card" onclick="openPopup(houseData.find(h => h.id === ${house.id}))">
                            <div class="story-access-badge ${house.digitalAccess}">${house.digitalAccess.charAt(0).toUpperCase() + house.digitalAccess.slice(1)} access</div>
                            <h4>${house.title}</h4>
                            <p>${house.story?.quote || 'Click to read their story'}</p>
                            <span class="story-resident">${house.story?.resident || 'Community Member'}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } else if (content.content.stats) {
        // Statistics panel
        const stats = content.content.stats;
        customContent.innerHTML = `
            <div class="custom-header">
                <h3>${content.content.header.title}</h3>
                <p class="custom-subtitle">${content.content.header.subtitle}</p>
            </div>
            <div class="stats-overview">
                <div class="stat-card-large high">
                    <div class="stat-number">${stats.highAccess}</div>
                    <div class="stat-label">High Access Households</div>
                    <div class="stat-percentage">${Math.round((stats.highAccess/stats.total)*100)}%</div>
                </div>
                <div class="stat-card-large medium">
                    <div class="stat-number">${stats.mediumAccess}</div>
                    <div class="stat-label">Medium Access Households</div>
                    <div class="stat-percentage">${Math.round((stats.mediumAccess/stats.total)*100)}%</div>
                </div>
                <div class="stat-card-large low">
                    <div class="stat-number">${stats.lowAccess}</div>
                    <div class="stat-label">Low Access Households</div>
                    <div class="stat-percentage">${Math.round((stats.lowAccess/stats.total)*100)}%</div>
                </div>
            </div>
        `;
    } else if (content.content.legend) {
        // Legend panel
        customContent.innerHTML = `
            <div class="custom-header">
                <h3>${content.content.header.title}</h3>
                <p class="custom-subtitle">${content.content.header.subtitle}</p>
            </div>
            <div class="legend-list">
                ${content.content.legend.map(item => `
                    <div class="legend-item">
                        <div class="legend-icon">
                            <i class="fa-solid ${item.icon}" style="color: ${item.color}; font-size: 1.2rem;"></i>
                        </div>
                        <div class="legend-text">
                            <h4>${item.label}</h4>
                            <p>${item.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Show modal
    modal.style.display = 'block';
    modal.classList.add('show');
    document.getElementById('map').classList.add('map-with-panel');
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
}

// Update close functionality to handle custom panels
const originalCloseHandler = closeBtn.onclick;
closeBtn.onclick = function() {
    // Hide custom content
    const customContent = document.getElementById('custom-content');
    if (customContent) {
        customContent.style.display = 'none';
    }
    
    // Show access badge again
    document.querySelector('.access-indicator').style.display = 'flex';
    
    // Show navbar again
    showNavbar();
    
    // Clear active nav button
    clearActiveNavButton();
    
    // Call original close handler
    originalCloseHandler.call(this);
};

// ==========================================
// AUTO-PROGRESSION SYSTEM FOR GUIDED MODES
// ==========================================

let currentMode = 'manual';
let progressionActive = false;
let currentStoryIndex = 0;
let progressionTimer = null;
let progressionCountdown = 15;
let isPaused = false;

// Journey definitions with thematic bridges
const journeyModes = {
    'age-journey': {
        name: 'Age-Based Journey',
        theme: 'From Elderly to Digital Native',
        description: 'Experience how digital adoption varies across generations, following the Douglas Adams technology framework.',
        locations: [
            { 
                type: 'street_interview', 
                name: 'Street Interview 3', 
                participant: 'Maili Tamang',
                videoFile: 'Maili_Tamang.mp4',
                ageGroup: 'Elderly (Complete Non-user)',
                bridge: "We begin with complete digital avoidance - a choice to remain disconnected from technologies that feel foreign and threatening..."
            },
            { 
                type: 'khajaghar', 
                name: 'Majuwa Khajaghar', 
                participant: 'Sunita Tamang',
                videoFile: 'Sunita_Tamang.mp4',
                ageGroup: 'Middle-age (Learning Tibetan Online)',
                bridge: "Moving to selective adoption - technology becomes useful when it serves cultural values and personal meaning..."
            },
            { 
                type: 'school', 
                participant: 'Principal',
                videoFile: 'Principal.mp4',
                ageGroup: 'Late Adopter (Learned at 40)',
                bridge: "Professional necessity drives learning - adult acquisition of digital skills through workplace requirements..."
            },
            { 
                type: 'khajaghar', 
                name: 'Thaple Khajaghar', 
                participant: 'Aman Tamang',
                videoFile: 'Aman_Tamang.mp4',
                ageGroup: 'Digital Native (17 years old)',
                bridge: "Finally, we meet those for whom technology is natural - digital natives who bridge traditional and digital worlds..."
            }
        ]
    },
    'efficacy-spectrum': {
        name: 'Self-Efficacy Spectrum',
        theme: 'From Complete Avoidance to High Confidence',
        description: 'Journey through different levels of digital confidence and self-efficacy, revealing the third-level digital divide.',
        locations: [
            { 
                type: 'street_interview', 
                name: 'Street Interview 3', 
                participant: 'Maili Tamang', 
                efficacy: 'Complete Avoidance',
                bridge: "Starting with complete avoidance - when digital technologies feel too risky or complex to attempt..."
            },
            { 
                type: 'house', 
                id: 3, 
                participant: 'Tej Lama', 
                efficacy: 'Low Persistence',
                bridge: "Moving to low persistence - 'if I can't learn it, I leave it' - limited tolerance for digital difficulty..."
            },
            { 
                type: 'khajaghar', 
                name: 'Majuwa Khajaghar', 
                participant: 'Sunita Tamang', 
                efficacy: 'Selective Confidence',
                bridge: "Developing selective confidence - success in specific digital domains like cultural learning builds targeted expertise..."
            },
            { 
                type: 'khajaghar', 
                name: 'Thaple Khajaghar', 
                participant: 'Aman Tamang', 
                efficacy: 'High Confidence',
                bridge: "Reaching high confidence - digital native integration where technology becomes a natural extension of capability..."
            }
        ]
    }
};

// Mode switching functionality (now triggered from Stories panel)

function switchMode(mode) {
    if (progressionActive) {
        stopProgression();
    }
    
    currentMode = mode;
    
    if (mode === 'manual') {
        hideProgressionPanel();
    } else {
        startGuidedJourney(mode);
    }
}

function startGuidedJourney(mode) {
    console.log('startGuidedJourney called with mode:', mode);
    const journey = journeyModes[mode];
    console.log('Found journey:', journey);
    
    if (!journey) {
        console.error('No journey found for mode:', mode);
        return;
    }
    
    console.log('Setting up journey progression...');
    currentMode = mode; // Fix: Set the current mode!
    currentStoryIndex = 0;
    progressionActive = true;
    isPaused = false;
    
    console.log('Showing progression panel...');
    showProgressionPanel(journey);
    console.log('Going to story 0...');
    goToStory(0);
}

// New journey launcher functions for the Stories panel
function startAgeBasedJourney() {
    console.log('Starting Progressive Discovery Age Journey');
    // Close the stories panel modal first
    const modal = document.getElementById('popup-modal');
    if (modal) {
        modal.classList.remove('show');
        document.getElementById('map').classList.remove('map-with-panel');
        setTimeout(() => {
            modal.style.display = 'none';
            map.invalidateSize();
        }, 300);
    }
    
    // Initialize progressive discovery story mode
    setTimeout(() => {
        initializeProgressiveStoryMode();
    }, 500);
}

// Function to play the Age intro video
function playAgeIntroVideo() {
    console.log('playAgeIntroVideo called');
    const videoOverlay = document.getElementById('cinematic-video-overlay');
    const cinematicVideo = document.getElementById('cinematic-video');
    const skipButton = document.getElementById('skip-video');
    
    if (!videoOverlay || !cinematicVideo || !skipButton) {
        console.error('Video elements not found');
        return;
    }
    
    // Update video source
    cinematicVideo.src = 'video/intro/Age intro.mp4';
    console.log('Video source set to:', cinematicVideo.src);
    
    // Show video overlay
    videoOverlay.style.display = 'flex';
    videoOverlay.classList.add('video-fade-in');
    
    // Try to play with audio (modern browsers may block this)
    cinematicVideo.currentTime = 0;
    cinematicVideo.muted = false;
    
    const playPromise = cinematicVideo.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('Video started playing with audio');
            // Video is playing successfully
        }).catch(e => {
            console.warn('Autoplay with audio failed, trying muted:', e);
            
            // Try muted autoplay
            cinematicVideo.muted = true;
            cinematicVideo.play().then(() => {
                console.log('Video started playing muted');
                // Show unmute button
                showUnmuteButton(cinematicVideo, videoOverlay);
            }).catch(e2 => {
                console.warn('Muted autoplay also failed:', e2);
                // Show manual play button
                showManualPlayButton(cinematicVideo, videoOverlay);
            });
        });
    } else {
        // Fallback for older browsers
        showManualPlayButton(cinematicVideo, videoOverlay);
    }
    
    // Skip button functionality
    skipButton.onclick = skipToAgeJourney;
    
    // When video ends, start the journey
    cinematicVideo.onended = skipToAgeJourney;
    
    function skipToAgeJourney() {
        console.log('skipToAgeJourney called');
        videoOverlay.classList.add('video-fade-out');
        cinematicVideo.pause();
        cinematicVideo.muted = true; // Restore muted state for other videos
        
        // Remove any video control buttons
        removeVideoButtons(videoOverlay);
        
        setTimeout(() => {
            videoOverlay.style.display = 'none';
            videoOverlay.classList.remove('video-fade-in', 'video-fade-out');
            
            // CRITICAL: Close the Stories panel completely before starting guided journey
            const modal = document.getElementById('popup-modal');
            if (modal) {
                console.log('Closing Stories panel before guided journey');
                modal.classList.remove('show');
                modal.style.display = 'none';
                document.getElementById('map').classList.remove('map-with-panel');
                
                // Clear any existing modal content
                clearModalContent();
                
                // Ensure map is properly sized
                map.invalidateSize();
            }
            
            console.log('About to start guided journey with age-journey mode');
            
            // CORRECT APPROACH: Use existing Street Interview 3 popup (with video-first redesign)
            console.log('Opening existing Street Interview 3 popup for Maili Tamang');
            openStreetInterviewPopup({name: 'Street Interview 3'});
        }, 500);
    }
}

function startSelfEfficacyJourney() {
    console.log('Starting Self-Efficacy Journey');
    // Close the stories panel modal first
    const modal = document.getElementById('popup-modal');
    const closeButton = document.querySelector('.close');
    if (modal && closeButton) {
        modal.classList.remove('show');
        document.getElementById('map').classList.remove('map-with-panel');
        setTimeout(() => {
            modal.style.display = 'none';
            map.invalidateSize();
        }, 300);
    }
    // Start the self-efficacy journey mode
    setTimeout(() => {
        startGuidedJourney('efficacy-spectrum');
    }, 500);
}

function showProgressionPanel(journey) {
    console.log('showProgressionPanel called with journey:', journey);
    const panel = document.getElementById('auto-progression-panel');
    console.log('Found panel element:', panel);
    
    if (!panel) {
        console.error('auto-progression-panel element not found!');
        return;
    }
    
    panel.style.display = 'block';
    console.log('Panel display set to block');
    
    const totalStoriesEl = document.getElementById('total-stories');
    const currentThemeEl = document.getElementById('current-story-theme');
    
    if (totalStoriesEl) totalStoriesEl.textContent = journey.locations.length;
    if (currentThemeEl) currentThemeEl.textContent = journey.theme;
    
    console.log('About to call updateProgressDisplay');
    updateProgressDisplay();
}

function hideProgressionPanel() {
    document.getElementById('auto-progression-panel').style.display = 'none';
    progressionActive = false;
    if (progressionTimer) {
        clearInterval(progressionTimer);
        progressionTimer = null;
    }
}

function goToStory(index) {
    const journey = journeyModes[currentMode];
    if (!journey || index >= journey.locations.length) {
        completeJourney();
        return;
    }
    
    // Show thematic bridge if moving to a new story (not the first one)
    if (index > 0 && currentStoryIndex !== index) {
        showThematicBridge(journey.locations[index], () => {
            proceedToStory(index);
        });
    } else {
        proceedToStory(index);
    }
}

function proceedToStory(index) {
    const journey = journeyModes[currentMode];
    currentStoryIndex = index;
    const location = journey.locations[index];
    
    updateProgressDisplay();
    
    // Animate to location first, then play participant video
    animateToLocation(location, () => {
        // After arriving at location, play the participant video
        playParticipantVideo(location);
    });
}

function showThematicBridge(location, callback) {
    const overlay = document.getElementById('thematic-bridge-overlay');
    const progressFill = document.getElementById('bridge-progress-fill');
    const timer = document.getElementById('bridge-timer');
    
    // Update bridge content
    document.getElementById('bridge-title').textContent = `Next: ${location.participant}`;
    document.getElementById('bridge-text').textContent = location.bridge;
    
    // Show overlay
    overlay.style.display = 'flex';
    
    // Animate bridge transition
    let bridgeCountdown = 4;
    timer.textContent = bridgeCountdown;
    progressFill.style.width = '0%';
    
    const bridgeInterval = setInterval(() => {
        bridgeCountdown--;
        timer.textContent = bridgeCountdown;
        progressFill.style.width = ((4 - bridgeCountdown) / 4 * 100) + '%';
        
        if (bridgeCountdown <= 0) {
            clearInterval(bridgeInterval);
            overlay.style.display = 'none';
            callback();
        }
    }, 1000);
}

function animateToLocation(location, callback) {
    let coords, openFunction;
    
    switch (location.type) {
        case 'house':
            const house = houseData.find(h => h.id === location.id);
            coords = [house.lat, house.lng];
            openFunction = () => openPopup(house);
            break;
        case 'school':
            coords = [27.724667, 85.228028];
            openFunction = () => openSchoolPopup();
            break;
        case 'street_interview':
            if (location.name === 'Street Interview 3') {
                // Street Interview 3 coordinates (Maili Tamang)
                coords = [27.726789, 85.240472];
                openFunction = () => openStreetInterviewPopup({name: 'Street Interview 3'});
            }
            break;
        case 'khajaghar':
            if (location.name === 'Majuwa Khajaghar') {
                coords = [27.724592, 85.224491];
                openFunction = () => openKhajagharPopup({name: 'Majuwa Khajaghar', lat: 27.724592, lng: 85.224491});
            } else if (location.name === 'Thaple Khajaghar') {
                coords = [27.739199, 85.236208];
                openFunction = () => openKhajagharPopup({name: 'Thaple Khajaghar', lat: 27.739199, lng: 85.236208});
            }
            break;
    }
    
    if (coords) {
        map.flyTo(coords, 16, {
            animate: true,
            duration: 2
        });
        
        setTimeout(() => {
            // Call callback if provided, otherwise use original openFunction
            if (callback) {
                callback();
            } else {
                openFunction();
            }
        }, 2500);
    }
}

// Helper function to show unmute button when video plays muted
function showUnmuteButton(video, overlay) {
    // Remove any existing buttons
    removeVideoButtons(overlay);
    
    const unmuteButton = document.createElement('button');
    unmuteButton.innerHTML = '<i class="fas fa-volume-up"></i> Click to Enable Audio';
    unmuteButton.className = 'video-control-button';
    unmuteButton.style.cssText = `
        position: absolute;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        border: 2px solid white;
        padding: 12px 20px;
        border-radius: 25px;
        font-size: 0.9rem;
        cursor: pointer;
        z-index: 10;
        backdrop-filter: blur(5px);
    `;
    
    unmuteButton.onclick = () => {
        video.muted = false;
        unmuteButton.remove();
        console.log('Video unmuted');
    };
    
    overlay.appendChild(unmuteButton);
}

// Helper function to show manual play button when autoplay fails
function showManualPlayButton(video, overlay) {
    // Remove any existing buttons
    removeVideoButtons(overlay);
    
    const playButton = document.createElement('button');
    playButton.innerHTML = '<i class="fas fa-play"></i> Click to Play Video';
    playButton.className = 'video-control-button';
    playButton.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.9);
        color: white;
        border: 3px solid white;
        padding: 20px 30px;
        border-radius: 30px;
        font-size: 1.2rem;
        font-weight: 600;
        cursor: pointer;
        z-index: 10;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
    `;
    
    playButton.onmouseover = () => {
        playButton.style.background = 'rgba(255,255,255,0.2)';
        playButton.style.transform = 'translate(-50%, -50%) scale(1.05)';
    };
    
    playButton.onmouseout = () => {
        playButton.style.background = 'rgba(0,0,0,0.9)';
        playButton.style.transform = 'translate(-50%, -50%) scale(1)';
    };
    
    playButton.onclick = () => {
        video.muted = false; // Try to play with audio
        video.play().then(() => {
            playButton.remove();
            console.log('Manual play successful with audio');
        }).catch(e => {
            console.warn('Manual play with audio failed, trying muted:', e);
            video.muted = true;
            video.play().then(() => {
                playButton.remove();
                showUnmuteButton(video, overlay);
                console.log('Manual play successful muted');
            }).catch(e2 => {
                console.error('Manual play completely failed:', e2);
                playButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Video Error';
            });
        });
    };
    
    overlay.appendChild(playButton);
}

// Helper function to remove existing video control buttons
function removeVideoButtons(overlay) {
    const existingButtons = overlay.querySelectorAll('.video-control-button');
    existingButtons.forEach(button => button.remove());
}

// Function to play participant-specific video during guided journey using side panel
function playParticipantVideo(location) {
    console.log('Playing video for participant:', location.participant);
    console.log('Location object:', location);
    
    // Construct video path - use explicit videoFile if available, otherwise construct from participant name
    const videoPath = location.videoFile 
        ? `video/participants/${location.videoFile}`
        : `video/participants/${location.participant.replace(/\s+/g, '_')}.mp4`;
    
    // Create participant content for side panel
    const participantContent = {
        title: `${location.participant}'s Story`,
        location: location.name || location.type,
        ageGroup: location.ageGroup || location.efficacy,
        story: {
            resident: location.participant,
            quote: location.bridge || `Watch ${location.participant}'s story about their digital experiences.`
        },
        youtubeId: null, // We'll use local video instead
        localVideo: videoPath,
        isGuidedJourney: true,
        participant: location.participant
    };
    
    console.log('Participant content being passed:', participantContent);
    
    // Open the side panel with participant content
    console.log('About to call openGuidedStoryPanel with:', participantContent);
    openGuidedStoryPanel(participantContent);
}

// Function to clear modal content to prevent conflicts
function clearModalContent() {
    // Clear all text content
    document.getElementById('popup-title').textContent = '';
    document.getElementById('location-name').textContent = '';
    document.getElementById('interview-count').textContent = '';
    document.getElementById('resident-name').textContent = '';
    document.getElementById('resident-role').textContent = '';
    document.getElementById('resident-description').textContent = '';
    
    // Clear photo sources and quotes
    document.getElementById('photo-1').src = '';
    document.getElementById('photo-2').src = '';
    document.getElementById('photo-3').src = '';
    document.getElementById('quote-1').textContent = '';
    document.getElementById('quote-2').textContent = '';
    document.getElementById('quote-3').textContent = '';
    
    // Clear video content
    document.getElementById('video-1-heading').textContent = '';
    document.getElementById('youtube-video').src = '';
    
    // Remove any local video elements
    const existingLocalVideo = document.getElementById('local-video');
    if (existingLocalVideo) {
        existingLocalVideo.remove();
    }
    
    // Clear headshot
    document.getElementById('resident-headshot').src = '';
    
    // CRITICAL: Clear custom content section (where Stories content appears)
    const customContent = document.getElementById('custom-content');
    if (customContent) {
        customContent.innerHTML = '';
        customContent.style.display = 'none';
    }
    
    // Reset video display
    document.getElementById('youtube-video').style.display = 'block';
}

// Modified version of openPopup specifically for guided journey stories
function openGuidedStoryPanel(content) {
    console.log('Opening guided story panel for:', content.title);
    console.log('Full content object received:', content);
    
    // Ensure modal is properly reset
    const modal = document.getElementById('popup-modal');
    
    // Force close any existing modal state
    modal.classList.remove('show');
    modal.style.display = 'none';
    document.getElementById('map').classList.remove('map-with-panel');
    
    // Clear any existing content first to avoid conflicts
    clearModalContent();
    
    // Small delay to ensure clean state, then open
    setTimeout(() => {
        // Show the modal panel
        modal.style.display = 'block';
        modal.classList.add('show');
        
        // Keep map visible on left by adjusting layout
        document.getElementById('map').classList.add('map-with-panel');
        
        // Hide navbar during guided journey
        hideNavbar();
        
        console.log('Modal opened for guided journey');
        
        // Populate panel content
        document.getElementById('popup-title').textContent = content.title;
        document.getElementById('location-name').textContent = content.location;
        document.getElementById('interview-count').textContent = content.ageGroup || '';
        
        // Show appropriate access indicator
        const accessIndicator = document.querySelector('.access-indicator');
        accessIndicator.style.display = 'flex';
        accessIndicator.className = 'access-indicator guided-journey';
        // Removed access-level element - now using badge only
        
        // CRITICAL: Explicit content section management
        console.log('Managing content sections visibility...');
        
        // Highlight the active marker (Street Interview 3 for Maili Tamang)
        if (content.story.resident === 'Maili Tamang') {
            highlightActiveMarker('street_interview_3');
        }
        
        // Hide ALL other content sections first
        document.getElementById('foundation-content').style.display = 'none';
        
        const customContent = document.getElementById('custom-content');
        if (customContent) {
            console.log('Hiding custom-content section');
            customContent.style.display = 'none';
            customContent.innerHTML = ''; // Clear any existing content
        }
        
        // Show ONLY resident content
        const residentContent = document.getElementById('resident-content');
        console.log('Showing resident-content section');
        residentContent.style.display = 'block';
        
        // Set up profile section
        document.getElementById('resident-name').textContent = content.story.resident;
        document.getElementById('resident-role').textContent = content.ageGroup || 'Community Member';
        document.getElementById('resident-description').textContent = content.story.quote;
        
        // Set up headshot
        const headshotPath = getHeadshotPath(content.story.resident);
        document.getElementById('resident-headshot').src = headshotPath;
        
        // Set up photo section with lifestyle photos (not headshots)
        const photoSection = document.querySelector('.photo-collage-section');
        photoSection.style.display = 'block';
        
        // Generate lifestyle photos for this participant
        const participant = content.participant || content.story.resident;
        const lifestylePhotos = [
            {
                image: `photos/lifestyle/${participant.replace(/\s+/g, '_')}_1.jpg`,
                quote: "Daily life and community engagement"
            },
            {
                image: `photos/lifestyle/${participant.replace(/\s+/g, '_')}_2.jpg`, 
                quote: "Technology use in context"
            },
            {
                image: `photos/lifestyle/${participant.replace(/\s+/g, '_')}_3.jpg`,
                quote: "Community and family connections"
            }
        ];
        
        // Update photo grid with lifestyle photos
        const photoGrid = photoSection.querySelector('.photo-collage-grid');
        if (photoGrid) {
            photoGrid.innerHTML = lifestylePhotos.map((photo, index) => `
                <div class="collage-item">
                    <img src="${photo.image}" alt="${participant} lifestyle photo ${index + 1}" />
                    <div class="photo-quote">
                        <p>${photo.quote}</p>
                    </div>
                </div>
            `).join('');
        }
        
        // Set up video section with local video
        const videoContainer = document.querySelector('.youtube-container');
        const youtubeVideo = document.getElementById('youtube-video');
        
        if (content.localVideo) {
            // Set video heading based on participant - special case for Maili Tamang
            if (content.story.resident === 'Maili Tamang') {
                document.getElementById('video-1-heading').textContent = '🎥 Perception of Mobile Phones - Maili Tamang';
            } else {
                document.getElementById('video-1-heading').textContent = `🎥 ${content.story.resident}'s Story`;
            }
            
            // Replace YouTube embed with local video
            youtubeVideo.style.display = 'none';
            
            // Create local video element if it doesn't exist
            let localVideoElement = document.getElementById('local-video');
            if (!localVideoElement) {
                localVideoElement = document.createElement('video');
                localVideoElement.id = 'local-video';
                localVideoElement.controls = true;
                localVideoElement.style.cssText = `
                    width: 100%;
                    height: 300px;
                    border-radius: 8px;
                    background: #000;
                `;
                videoContainer.appendChild(localVideoElement);
            }
            
            localVideoElement.style.display = 'block';
            localVideoElement.src = content.localVideo;
            localVideoElement.muted = false;
            
            // Auto-play the video
            localVideoElement.play().catch(e => {
                console.log('Auto-play failed, user interaction required');
            });
            
            // When video ends, continue to next story
            localVideoElement.onended = () => {
                setTimeout(() => {
                    continueToNextStory();
                }, 2000); // Small delay before continuing
            };
        }
        
        // Hide audio and stats sections for guided journey
        const audioSection = document.getElementById('audio-section');
        if (audioSection) audioSection.style.display = 'none';
        
        const statsSection = document.getElementById('resident-stats');
        if (statsSection) statsSection.style.display = 'none';
        
        // Hide other video sections (video 2 and 3)
        const video2Section = document.getElementById('video-2-section');
        if (video2Section) video2Section.style.display = 'none';
        
        const video3Section = document.getElementById('video-3-section');
        if (video3Section) video3Section.style.display = 'none';
        
        // Show main video section
        const videoSection = document.querySelector('.video-section');
        if (videoSection) videoSection.style.display = 'block';
    
        // Add continue button
        addContinueButton();
    }, 100); // Close the setTimeout
}

// Function to continue to next story in guided journey
function continueToNextStory() {
    console.log('Continuing to next story in guided journey...');
    
    // Note: headshot overlay functionality was removed
    
    // Close the current panel
    const modal = document.getElementById('popup-modal');
    modal.classList.remove('show');
    document.getElementById('map').classList.remove('map-with-panel');
    
    setTimeout(() => {
        modal.style.display = 'none';
        map.invalidateSize();
        
        // Move to next story in journey
        const nextIndex = currentStoryIndex + 1;
        goToStory(nextIndex);
    }, 300);
}

// Add continue button to guided journey panel
function addContinueButton() {
    // Remove existing continue button if any
    const existingButton = document.getElementById('continue-journey-btn');
    if (existingButton) existingButton.remove();
    
    // Create continue button
    const continueButton = document.createElement('button');
    continueButton.id = 'continue-journey-btn';
    continueButton.innerHTML = '<i class="fas fa-arrow-right"></i> Continue Journey';
    continueButton.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 30px;
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        color: white;
        border: none;
        padding: 15px 25px;
        border-radius: 25px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);
        z-index: 2000;
        transition: all 0.3s ease;
    `;
    
    continueButton.onmouseover = () => {
        continueButton.style.transform = 'translateY(-2px)';
        continueButton.style.boxShadow = '0 6px 20px rgba(5, 150, 105, 0.4)';
    };
    
    continueButton.onmouseout = () => {
        continueButton.style.transform = 'translateY(0)';
        continueButton.style.boxShadow = '0 4px 15px rgba(5, 150, 105, 0.3)';
    };
    
    continueButton.onclick = continueToNextStory;
    
    document.body.appendChild(continueButton);
}

function updateProgressDisplay() {
    const journey = journeyModes[currentMode];
    const location = journey.locations[currentStoryIndex];
    
    document.getElementById('current-story-num').textContent = currentStoryIndex + 1;
    document.getElementById('current-story-title').textContent = location.participant;
    
    // Update progress bar
    const progressPercent = ((currentStoryIndex + 1) / journey.locations.length) * 100;
    document.getElementById('progress-fill').style.width = progressPercent + '%';
    
    // Update control buttons
    document.getElementById('prev-story-btn').disabled = currentStoryIndex === 0;
    document.getElementById('next-story-btn').disabled = currentStoryIndex === journey.locations.length - 1;
}

function startCountdownTimer() {
    progressionCountdown = 15;
    updateCountdownDisplay();
    
    progressionTimer = setInterval(() => {
        if (!isPaused) {
            progressionCountdown--;
            updateCountdownDisplay();
            
            if (progressionCountdown <= 0) {
                nextStory();
            }
        }
    }, 1000);
}

function updateCountdownDisplay() {
    document.getElementById('timer-countdown').textContent = progressionCountdown;
}

function initializeProgressionControls() {
    const prevBtn = document.getElementById('prev-story-btn');
    const nextBtn = document.getElementById('next-story-btn');
    const pauseBtn = document.getElementById('pause-progression-btn');
    const exitBtn = document.getElementById('exit-progression-btn');
    
    // Check if elements exist before adding event listeners
    if (!prevBtn || !nextBtn || !pauseBtn || !exitBtn) {
        console.warn('Progression control elements not found');
        return;
    }
    
    prevBtn.addEventListener('click', prevStory);
    nextBtn.addEventListener('click', nextStory);
    pauseBtn.addEventListener('click', togglePause);
    exitBtn.addEventListener('click', exitProgression);
}

function prevStory() {
    if (currentStoryIndex > 0) {
        clearInterval(progressionTimer);
        goToStory(currentStoryIndex - 1);
    }
}

function nextStory() {
    clearInterval(progressionTimer);
    goToStory(currentStoryIndex + 1);
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById('pause-progression-btn');
    
    if (isPaused) {
        btn.innerHTML = '<i class="fas fa-play"></i> Resume';
        btn.classList.add('paused');
    } else {
        btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        btn.classList.remove('paused');
        if (progressionCountdown > 0) {
            startCountdownTimer();
        }
    }
}

function exitProgression() {
    stopProgression();
    switchMode('manual');
    
    // Reset mode selector to manual
    document.querySelector('.mode-option[data-mode="manual"]').click();
}

function stopProgression() {
    progressionActive = false;
    isPaused = false;
    if (progressionTimer) {
        clearInterval(progressionTimer);
        progressionTimer = null;
    }
    
    // Clear all highlighting when stopping progression
    clearAllMarkerHighlights();
    
    hideProgressionPanel();
}

function completeJourney() {
    stopProgression();
    alert(`🎉 Journey Complete!\n\nYou've experienced the ${journeyModes[currentMode].name} journey through Bhimdhunga's digital divide stories.\n\nFeel free to continue exploring manually or try the other guided journey mode.`);
    switchMode('manual');
}

// ==========================================
// MARKER HOVER AND CLICK INTERACTION SYSTEM
// ==========================================

// Create hover preview popup element
function createHoverPreview() {
    if (document.getElementById('marker-hover-preview')) return;
    
    const preview = document.createElement('div');
    preview.id = 'marker-hover-preview';
    preview.className = 'marker-hover-preview';
    preview.innerHTML = `
        <img class="preview-headshot" src="" alt="Participant photo">
        <div class="preview-name"></div>
        <div class="preview-age"></div>
    `;
    document.body.appendChild(preview);
}

// Show hover preview with participant info
function showHoverPreview(participant, event) {
    const age = getParticipantAge(participant);
    showHoverPreviewWithAge(participant, age, event);
}

// Get correct headshot file path with proper extension
function getHeadshotPath(participant) {
    // Map participant names to actual file names
    const fileMap = {
        'Maili Tamang': 'Maili Tamang.JPG',
        'Sunita Tamang': 'Sunita Tamang.JPG',
        'Principal': 'Shyam Krishna Bhattarai (HT).png',
        'Shyam Krishna Bhattarai (HT)': 'Shyam Krishna Bhattarai (HT).png',
        'Aman Tamang': 'Aman Tamang.png',
        'Tej Lama': 'Tej Lama.JPG',
        'Sikha Limbu': 'Sikha Limbu.JPG',
        'Sikha Limbu, Agriculture & Homemaker': 'Sikha Limbu.JPG',
        'Dhan Bahadur Tamang': 'Dhanbahadur Tamang.JPG',
        'Dhan Bahadur Tamang, Farmer': 'Dhanbahadur Tamang.JPG',
        'Ram Raj Lama': 'Ram raj lama.png',
        'Sudiksha Tamang': 'Sudiksha Tamang.JPG',
        'Tej Tamang': 'Tej Lama.JPG',
        'Tej Tamang, Local route driver': 'Tej Lama.JPG',
        'Pratima Tamang': 'Pratima Tamang.JPG',
        'Pratima Tamang, Farmer': 'Pratima Tamang.JPG',
        'Samjhana Lama': 'Samjhana Lama.JPG',
        'Bijaya Tamang': 'Bijay_tamang.png',
        'Mishri Tamang': 'default_female_avatar.jpg',
        'Nirisuchika Tamang, cloth shopowner': 'default_female_avatar.jpg',
    };
    
    return `photos/headshots/${fileMap[participant] || participant.replace(/\s+/g, '_') + '.jpg'}`;
}

// Show hover preview with explicit age
function showHoverPreviewWithAge(participant, age, event) {
    const preview = document.getElementById('marker-hover-preview');
    if (!preview) return;
    
    // Get participant data with correct file extension
    const headshotPath = getHeadshotPath(participant);
    
    // Update preview content
    preview.querySelector('.preview-headshot').src = headshotPath;
    preview.querySelector('.preview-name').textContent = participant;
    preview.querySelector('.preview-age').textContent = `Age: ${age}`;
    
    // Position near mouse/cursor
    if (event) {
        const rect = event.target ? event.target.getBoundingClientRect() : {right: event.clientX, top: event.clientY};
        preview.style.left = (rect.right || event.clientX) + 10 + 'px';
        preview.style.top = (rect.top || event.clientY) + 'px';
    }
    
    // Show preview
    preview.classList.add('show');
}

// Hide hover preview
function hideHoverPreview() {
    const preview = document.getElementById('marker-hover-preview');
    if (preview) {
        preview.classList.remove('show');
    }
}

// Get participant age (you'll need to add this data to journey locations)
function getParticipantAge(participant) {
    const ageData = {
        'Maili Tamang': '58',
        'Sunita Tamang': '45', 
        'Principal': '52',
        'Shyam Krishna Bhattarai (HT)': '52', // Principal's full name
        'Aman Tamang': '18',
        'Tej Lama': '34',
        'Sikha Limbu': '26',
        'Sikha Limbu, Agriculture & Homemaker': '26',
        'Dhan Bahadur Tamang': '40',
        'Dhan Bahadur Tamang, Farmer': '40',
        'Ram Raj Lama': '42',
        'Sudiksha Tamang': '28',
        'Tej Tamang': '34',
        'Tej Tamang, Local route driver': '34',
        'Pratima Tamang': '41',
        'Pratima Tamang, Farmer': '41',
        'Samjhana Lama': 'Unknown', // Age not provided
        'Bijaya Tamang': '17',
        'Mishri Tamang': '52',
        'Nirisuchika Tamang': '28',
        'Local Resident': '42',
        'Community Member': '35'
    };
    return ageData[participant] || 'Unknown';
}

// Function to highlight the active marker during guided journeys
function highlightActiveMarker(markerId) {
    // Clear any existing highlights first
    clearAllMarkerHighlights();
    
    // Add highlight based on marker type
    if (markerId === 'street_interview_3') {
        // Find Street Interview 3 marker and highlight it
        const streetInterviewMarkers = document.querySelectorAll('.interview-marker');
        streetInterviewMarkers.forEach((marker, index) => {
            if (index === 2) { // Street Interview 3 is index 2
                marker.style.background = 'rgba(99, 102, 241, 0.3)';
                marker.style.borderRadius = '50%';
                marker.style.padding = '8px';
                marker.style.transform = 'scale(1.2)';
                marker.style.transition = 'all 0.3s ease';
            }
        });
    }
}

// Function to clear all marker highlights
function clearAllMarkerHighlights() {
    const allMarkers = document.querySelectorAll('.interview-marker, .khajaghar-marker, .school-marker, .house-marker');
    allMarkers.forEach(marker => {
        marker.style.background = '';
        marker.style.borderRadius = '';
        marker.style.padding = '';
        marker.style.transform = '';
        marker.style.transition = '';
    });
}

// SIMPLE VIDEO SEQUENCE SYSTEM
const ageJourneyVideos = [
    {
        name: "Maili Tamang",
        video: "video/participants/Maili_Tamang.mp4",
        title: "🎥 Perception of Mobile Phones - Maili Tamang",
        marker: "street_interview_3"
    },
    {
        name: "Sunita Tamang", 
        video: "video/participants/Sunita_Tamang.mp4",
        title: "🎥 Sunita Tamang's Story",
        marker: "khajaghar_1"
    },
    {
        name: "Principal",
        video: "video/participants/Principal.mp4", 
        title: "🎥 Principal's Story",
        marker: "school"
    },
    {
        name: "Aman Tamang",
        video: "video/participants/Aman_Tamang.mp4",
        title: "🎥 Aman Tamang's Story", 
        marker: "khajaghar_2"
    }
];

let currentVideoIndex = 0;

function startAgeVideoSequence() {
    currentVideoIndex = 0;
    playVideoAtIndex(0);
}

function playVideoAtIndex(index) {
    if (index >= ageJourneyVideos.length) {
        console.log('Video sequence complete!');
        return;
    }
    
    const videoData = ageJourneyVideos[index];
    console.log('Playing video:', videoData.title);
    
    // Highlight the corresponding marker
    highlightActiveMarker(videoData.marker);
    
    // Open a simple video panel
    openSimpleVideoPanel(videoData);
}

function openSimpleVideoPanel(videoData) {
    // Get modal and clear it completely
    const modal = document.getElementById('popup-modal');
    
    // Clear everything and start fresh
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <div class="video-only-panel">
                <h2>${videoData.title}</h2>
                <video id="sequence-video" controls autoplay style="width: 100%; height: 400px;">
                    <source src="${videoData.video}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div class="video-controls">
                    <button id="next-video-btn">Next Video</button>
                    <button id="skip-sequence-btn">Skip Sequence</button>
                </div>
            </div>
        </div>
    `;
    
    // Show modal
    modal.style.display = 'block';
    modal.classList.add('show');
    document.getElementById('map').classList.add('map-with-panel');
    
    // Set up video event handlers
    const video = document.getElementById('sequence-video');
    const nextBtn = document.getElementById('next-video-btn');
    const skipBtn = document.getElementById('skip-sequence-btn');
    const closeBtn = modal.querySelector('.close');
    
    // When video ends, show next button
    video.onended = () => {
        nextBtn.style.display = 'inline-block';
    };
    
    // Next video button
    nextBtn.onclick = () => {
        currentVideoIndex++;
        playVideoAtIndex(currentVideoIndex);
    };
    
    // Skip sequence button
    skipBtn.onclick = () => {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.getElementById('map').classList.remove('map-with-panel');
        clearAllMarkerHighlights();
    };
    
    // Close button
    closeBtn.onclick = skipBtn.onclick;
}

// NEW VIDEO-FIRST PANEL SYSTEM
function openVideoFirstPanel(participantName) {
    console.log('Opening video-first panel for:', participantName);
    
    // Get participant data
    const participantData = getParticipantData(participantName);
    
    // Open modal with video-first layout
    const modal = document.getElementById('popup-modal');
    modal.style.display = 'block';
    modal.classList.add('show');
    document.getElementById('map').classList.add('map-with-panel');
    
    // Hide navbar
    hideNavbar();
    
    // Clear and setup content sections
    setupVideoFirstContent(participantData);
    
    // Highlight corresponding marker
    highlightActiveMarker(participantData.marker);
}

function getParticipantData(participantName) {
    const participants = {
        'Maili Tamang': {
            name: 'Maili Tamang',
            role: 'Elderly Community Member (Complete Digital Avoidance)',
            description: 'Traditional homemaker representing complete digital non-participation. Her perspective on mobile phones reveals generational concerns about technology adoption and cultural values.',
            video: 'video/participants/Maili_Tamang.mp4',
            videoTitle: '🎥 Perception of Mobile Phones - Maili Tamang',
            headshot: 'photos/headshots/Maili Tamang.JPG',
            marker: 'street_interview_3',
            location: 'Street Interview 3',
            ageGroup: 'Elderly (Complete Non-user)'
        },
        'Sunita Tamang': {
            name: 'Sunita Tamang',
            role: 'Middle-age (Learning Tibetan Online)',
            description: 'Uses technology selectively for cultural preservation and meaningful connections.',
            video: 'video/participants/Sunita_Tamang.mp4',
            videoTitle: '🎥 Sunita Tamang\'s Digital Journey',
            headshot: 'photos/headshots/Sunita Tamang.JPG',
            marker: 'khajaghar_1',
            location: 'Majuwa Khajaghar',
            ageGroup: 'Middle-age (Learning Tibetan Online)'
        },
        'Principal': {
            name: 'Principal',
            role: 'Late Adopter (Learned at 40)',
            description: 'Professional necessity drove digital skill acquisition in adulthood.',
            video: 'video/participants/Principal.mp4',
            videoTitle: '🎥 Principal\'s Professional Digital Adaptation',
            headshot: 'photos/headshots/Principal.JPG',
            marker: 'school',
            location: 'School',
            ageGroup: 'Late Adopter (Learned at 40)'
        },
        'Aman Tamang': {
            name: 'Aman Tamang',
            role: 'Digital Native (17 years old)',
            description: 'Young digital native bridging traditional and digital worlds.',
            video: 'video/participants/Aman_Tamang.mp4',
            videoTitle: '🎥 Aman Tamang\'s Digital Native Perspective',
            headshot: 'photos/headshots/Aman Tamang.JPG',
            marker: 'khajaghar_2',
            location: 'Thaple Khajaghar',
            ageGroup: 'Digital Native (17 years old)'
        }
    };
    
    return participants[participantName];
}

function setupVideoFirstContent(data) {
    // Clear any existing content
    clearModalContent();
    
    // Show only resident content
    document.getElementById('foundation-content').style.display = 'none';
    const customContent = document.getElementById('custom-content');
    if (customContent) customContent.style.display = 'none';
    document.getElementById('resident-content').style.display = 'block';
    
    // Setup header info
    document.getElementById('popup-title').textContent = data.name + "'s Story";
    document.getElementById('location-name').textContent = data.location;
    document.getElementById('interview-count').textContent = data.ageGroup;
    
    // Setup access indicator
    const accessIndicator = document.querySelector('.access-indicator');
    accessIndicator.style.display = 'flex';
    accessIndicator.className = 'access-indicator guided-journey';
    // Removed access-level element - now using badge only
    
    // 🎥 SHOWCASE VIDEO (TOP PRIORITY)
    document.getElementById('showcase-video-heading').textContent = data.videoTitle;
    const showcaseVideo = document.getElementById('showcase-video');
    showcaseVideo.src = data.video;
    
    // 👤 PROFILE SECTION
    document.getElementById('resident-name').textContent = data.name;
    document.getElementById('resident-role').textContent = data.role;
    document.getElementById('resident-description').textContent = data.description;
    document.getElementById('resident-headshot').src = data.headshot;
    
    // 📸 LIFESTYLE PHOTOS (placeholder for now)
    document.getElementById('photo-1').src = 'https://via.placeholder.com/400x200/f1f5f9/64748b?text=Daily+Life';
    document.getElementById('photo-2').src = 'https://via.placeholder.com/400x200/f1f5f9/64748b?text=Technology+Use';
    document.getElementById('photo-3').src = 'https://via.placeholder.com/400x200/f1f5f9/64748b?text=Community';
    
    document.getElementById('quote-1').textContent = 'Daily life and community engagement';
    document.getElementById('quote-2').textContent = 'Technology use in context';
    document.getElementById('quote-3').textContent = 'Community and family connections';
    
    // Hide other video sections for now
    const video2Section = document.getElementById('video-2-section');
    if (video2Section) video2Section.style.display = 'none';
    const video3Section = document.getElementById('video-3-section');
    if (video3Section) video3Section.style.display = 'none';
    
    // Hide audio and stats sections
    const audioSection = document.getElementById('audio-section');
    if (audioSection) audioSection.style.display = 'none';
    const statsSection = document.getElementById('resident-stats');
    if (statsSection) statsSection.style.display = 'none';
}


// Initialize hover system early
document.addEventListener('DOMContentLoaded', () => {
    // Create hover preview element
    createHoverPreview();
});

// ========================
// Progressive Discovery Story Mode
// ========================

const storyModeState = {
    isActive: false,
    currentCharacter: null,
    completedCharacters: [],
    viewingTimer: null,
    requiredViewTimes: {
        'maili': 70,
        'sunita': 60,
        'aman': 35
    }
};

function initializeProgressiveStoryMode() {
    console.log('Initializing Progressive Discovery Story Mode');
    
    // Reset state
    storyModeState.isActive = true;
    storyModeState.currentCharacter = null;
    storyModeState.completedCharacters = [];
    
    // Hide navbar
    hideNavbar();
    
    // Show character boxes overlay
    const charBoxesOverlay = document.getElementById('story-character-boxes');
    charBoxesOverlay.style.display = 'block';
    setTimeout(() => {
        charBoxesOverlay.classList.add('visible');
        // Adjust map layout for story mode
        document.getElementById('map').classList.add('map-with-story-mode');
        map.invalidateSize();
    }, 100);
    
    // Play the Age intro video first
    playAgeIntroVideoForStoryMode();
    
    // Setup event handlers
    setupStoryModeEventHandlers();
}

function playAgeIntroVideoForStoryMode() {
    console.log('Playing Age intro video for story mode');
    const videoOverlay = document.getElementById('cinematic-video-overlay');
    const cinematicVideo = document.getElementById('cinematic-video');
    const skipButton = document.getElementById('skip-video');
    
    if (!videoOverlay || !cinematicVideo || !skipButton) {
        console.error('Video elements not found');
        unlockFirstCharacter(); // Fallback
        return;
    }
    
    // Update video source
    cinematicVideo.src = 'video/intro/Age intro.mp4';
    
    // Show video overlay
    videoOverlay.style.display = 'flex';
    
    // Try to play with audio (with fallback)
    cinematicVideo.currentTime = 0;
    cinematicVideo.muted = false;
    
    const playPromise = cinematicVideo.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('Age intro video started playing');
        }).catch(e => {
            console.warn('Autoplay with audio failed, trying muted:', e);
            cinematicVideo.muted = true;
            cinematicVideo.play().catch(e2 => {
                console.error('Video playback failed completely:', e2);
                unlockFirstCharacter(); // Fallback
            });
        });
    }
    
    // When video ends, unlock first character
    cinematicVideo.onended = () => {
        console.log('Age intro video ended, unlocking Maili');
        hideVideoOverlay();
        unlockFirstCharacter();
    };
    
    // Skip button functionality
    skipButton.onclick = () => {
        console.log('Skip button clicked');
        hideVideoOverlay();
        unlockFirstCharacter();
    };
}

function hideVideoOverlay() {
    const videoOverlay = document.getElementById('cinematic-video-overlay');
    if (videoOverlay) {
        videoOverlay.style.display = 'none';
    }
}

function unlockFirstCharacter() {
    console.log('Unlocking first character: Maili');
    
    // Unlock Maili's box
    const mailiBox = document.getElementById('character-box-maili');
    mailiBox.classList.remove('locked');
    mailiBox.classList.add('unlocked');
    mailiBox.querySelector('.status-text').textContent = 'Click to Meet';
    
    // Highlight Maili's house on the map (Street Interview 3)
    highlightCharacterOnMap('maili');
    
    // Update progress
    updateStoryProgress();
}

function setupStoryModeEventHandlers() {
    // Character box click handlers
    document.getElementById('character-box-maili').addEventListener('click', () => {
        if (storyModeState.isActive && !storyModeState.completedCharacters.includes('maili')) {
            startCharacterViewing('maili');
        }
    });
    
    document.getElementById('character-box-sunita').addEventListener('click', () => {
        if (storyModeState.isActive && !storyModeState.completedCharacters.includes('sunita')) {
            // For Sunita, show hint to find her location instead of directly viewing
            if (!storyModeState.completedCharacters.includes('maili')) {
                return; // Can't access until Maili is completed
            }
            showAreaHint('Majuwa Area', 'Look for Sunita\'s khajaghar (tea shop) in the Majuwa area. The map will guide you with area highlighting.');
            storyModeState.currentUnlocked = 'sunita';
            highlightAreaForExploration('sunita');
        }
    });
    
    document.getElementById('character-box-aman').addEventListener('click', () => {
        if (storyModeState.isActive && !storyModeState.completedCharacters.includes('aman')) {
            // For Aman, show hint to find his location instead of directly viewing
            if (!storyModeState.completedCharacters.includes('sunita')) {
                return; // Can't access until Sunita is completed
            }
            showAreaHint('Thaple Area', 'Look for Aman at the khajaghar (tea shop) in the Thaple area. The map will guide you with area highlighting.');
            storyModeState.currentUnlocked = 'aman';
            highlightAreaForExploration('aman');
        }
    });
    
    // Exit story mode
    document.getElementById('exit-story-mode').addEventListener('click', exitStoryMode);
    
    // Area hint handlers
    document.getElementById('hint-understood').addEventListener('click', () => {
        document.getElementById('area-hint-overlay').style.display = 'none';
        highlightAreaForExploration(storyModeState.currentUnlocked);
    });
    
    // Story completion handler
    document.getElementById('completion-understood').addEventListener('click', () => {
        document.getElementById('story-completion-overlay').style.display = 'none';
        exitStoryMode();
    });
}

function startCharacterViewing(character) {
    console.log('Starting character viewing for:', character);
    
    storyModeState.currentCharacter = character;
    
    // Update character box to viewing state
    const charBox = document.getElementById(`character-box-${character}`);
    charBox.classList.remove('unlocked');
    charBox.classList.add('viewing');
    charBox.querySelector('.status-text').textContent = 'Viewing';
    
    // Show timer display
    const timerDisplay = charBox.querySelector('.timer-display');
    timerDisplay.style.display = 'flex';
    
    // Open the appropriate popup based on character
    openCharacterPopup(character);
    
    // Start viewing timer
    startViewingTimer(character);
}


function startViewingTimer(character) {
    const requiredTime = storyModeState.requiredViewTimes[character];
    let timeLeft = requiredTime;
    
    const charBox = document.getElementById(`character-box-${character}`);
    const timerText = charBox.querySelector('.timer-text');
    
    // Update timer display
    timerText.textContent = `${timeLeft}s`;
    
    storyModeState.viewingTimer = setInterval(() => {
        timeLeft--;
        timerText.textContent = `${timeLeft}s`;
        
        if (timeLeft <= 0) {
            completeCharacterViewing(character);
        }
    }, 1000);
}

function completeCharacterViewing(character) {
    console.log('Completing character viewing for:', character);
    
    // Clear timer
    if (storyModeState.viewingTimer) {
        clearInterval(storyModeState.viewingTimer);
        storyModeState.viewingTimer = null;
    }
    
    // Update character box to completed
    const charBox = document.getElementById(`character-box-${character}`);
    charBox.classList.remove('viewing');
    charBox.classList.add('completed');
    charBox.querySelector('.status-text').textContent = 'Completed';
    charBox.querySelector('.timer-display').style.display = 'none';
    
    // Add to completed list
    storyModeState.completedCharacters.push(character);
    storyModeState.currentCharacter = null;
    
    // Update progress
    updateStoryProgress();
    
    // Unlock next character or show completion
    unlockNextCharacter(character);
}

function unlockNextCharacter(justCompleted) {
    if (justCompleted === 'maili') {
        // Unlock Sunita but don't show location
        const sunitaBox = document.getElementById('character-box-sunita');
        sunitaBox.classList.remove('locked');
        sunitaBox.classList.add('unlocked');
        sunitaBox.querySelector('.status-text').textContent = 'Find & Meet';
        
        storyModeState.currentUnlocked = 'sunita';
        
        // Show area hint for Majuwa (but don't highlight yet)
        setTimeout(() => {
            showAreaHint('Majuwa Area', 'Look for Sunita\'s khajaghar (tea shop) in the Majuwa area. The map will guide you with area highlighting.');
        }, 500);
        
    } else if (justCompleted === 'sunita') {
        // Unlock Aman but don't show location
        const amanBox = document.getElementById('character-box-aman');
        amanBox.classList.remove('locked');
        amanBox.classList.add('unlocked');
        amanBox.querySelector('.status-text').textContent = 'Find & Meet';
        
        storyModeState.currentUnlocked = 'aman';
        
        // Show area hint for Thaple (but don't highlight yet)
        setTimeout(() => {
            showAreaHint('Thaple Area', 'Look for Aman at the khajaghar (tea shop) in the Thaple area. The map will guide you with area highlighting.');
        }, 500);
        
    } else if (justCompleted === 'aman') {
        // All characters completed - show completion overlay
        showStoryCompletion();
    }
}

function showAreaHint(title, text) {
    const hintOverlay = document.getElementById('area-hint-overlay');
    document.getElementById('hint-title').textContent = title;
    document.getElementById('hint-text').textContent = text;
    hintOverlay.style.display = 'flex';
}

function highlightAreaForExploration(character) {
    // Highlight the appropriate area for the character
    if (character === 'sunita') {
        // Highlight Majuwa area (where Sunita's khajaghar is)
        highlightSpecificArea('Majuwa');
    } else if (character === 'aman') {
        // Highlight Thaple area (where Aman's khajaghar is)
        highlightSpecificArea('Thaple');
    }
}

function highlightSpecificArea(areaName) {
    // Find and highlight the specific area circle
    const areaData = {
        'Majuwa': { coords: [27.725122, 85.226066], radius: 250 },
        'Thaple': { coords: [27.738486, 85.235668], radius: 400 }
    };
    
    if (areaData[areaName]) {
        const area = areaData[areaName];
        // Add pulsing highlight to the area
        const highlightCircle = L.circle(area.coords, {
            radius: area.radius,
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8,
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            className: 'exploration-highlight'
        }).addTo(map);
        
        // Animate the highlight
        let opacity = 0.2;
        let increasing = true;
        const pulseInterval = setInterval(() => {
            if (increasing) {
                opacity += 0.05;
                if (opacity >= 0.4) increasing = false;
            } else {
                opacity -= 0.05;
                if (opacity <= 0.1) increasing = true;
            }
            highlightCircle.setStyle({ fillOpacity: opacity });
        }, 100);
        
        // Remove highlight after 30 seconds
        setTimeout(() => {
            clearInterval(pulseInterval);
            map.removeLayer(highlightCircle);
        }, 30000);
        
        // Zoom to area
        map.flyTo(area.coords, 15, { animate: true, duration: 2 });
    }
}

function highlightCharacterOnMap(character) {
    if (character === 'maili') {
        // Highlight Street Interview 3 marker
        map.flyTo([27.726670, 85.224680], 16, { animate: true, duration: 2 });
    }
}

function updateStoryProgress() {
    const progressCount = document.getElementById('progress-count');
    const progressFill = document.getElementById('story-progress-fill');
    
    const completed = storyModeState.completedCharacters.length;
    const total = 3;
    
    progressCount.textContent = completed;
    progressFill.style.width = `${(completed / total) * 100}%`;
}

function showStoryCompletion() {
    const completionOverlay = document.getElementById('story-completion-overlay');
    completionOverlay.style.display = 'flex';
}

function exitStoryMode() {
    console.log('Exiting story mode');
    
    // Reset state
    storyModeState.isActive = false;
    storyModeState.currentCharacter = null;
    storyModeState.completedCharacters = [];
    
    // Clear any timers
    if (storyModeState.viewingTimer) {
        clearInterval(storyModeState.viewingTimer);
        storyModeState.viewingTimer = null;
    }
    
    // Hide character boxes overlay
    const charBoxesOverlay = document.getElementById('story-character-boxes');
    charBoxesOverlay.classList.remove('visible');
    setTimeout(() => {
        charBoxesOverlay.style.display = 'none';
        // Remove map layout adjustments
        document.getElementById('map').classList.remove('map-with-story-mode');
        map.invalidateSize();
    }, 400);
    
    // Close any open popups
    const modal = document.getElementById('popup-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.getElementById('map').classList.remove('map-with-panel');
    }
    
    // Show navbar
    showNavbar();
    
    // Reset map view
    map.setView([27.733, 85.240], 14);
    map.invalidateSize();
    
    // Reset character boxes to locked state
    resetCharacterBoxes();
}

function resetCharacterBoxes() {
    const characters = ['maili', 'sunita', 'aman'];
    characters.forEach(char => {
        const box = document.getElementById(`character-box-${char}`);
        box.className = 'character-box locked';
        box.querySelector('.status-text').textContent = 'Locked';
        box.querySelector('.timer-display').style.display = 'none';
    });
    
    // Reset progress
    document.getElementById('progress-count').textContent = '0';
    document.getElementById('story-progress-fill').style.width = '0%';
}

function showNavbar() {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        navbar.classList.remove('hidden');
    }
}

// Helper function to check if we should start story mode viewing timer
function checkAndStartStoryModeViewing(location) {
    if (!storyModeState.isActive) return;
    
    let character = null;
    
    // Determine which character based on the location
    if (location && location.name === 'Street Interview 3') {
        character = 'maili';
    } else if (location && location.name === 'Majuwa Khajaghar') {
        character = 'sunita';
    } else if (location && location.name === 'Thaple Khajaghar') {
        character = 'aman';
    }
    
    // Start viewing timer if this is an unlocked character
    if (character && !storyModeState.completedCharacters.includes(character)) {
        const charBox = document.getElementById(`character-box-${character}`);
        if (charBox && charBox.classList.contains('unlocked')) {
            console.log('Starting story mode viewing for:', character);
            startCharacterViewingFromMap(character);
        }
    }
}

function startCharacterViewingFromMap(character) {
    storyModeState.currentCharacter = character;
    
    // Update character box to viewing state
    const charBox = document.getElementById(`character-box-${character}`);
    charBox.classList.remove('unlocked');
    charBox.classList.add('viewing');
    charBox.querySelector('.status-text').textContent = 'Viewing';
    
    // Show timer display
    const timerDisplay = charBox.querySelector('.timer-display');
    timerDisplay.style.display = 'flex';
    
    // Start viewing timer
    startViewingTimer(character);
}