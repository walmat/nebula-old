const profiles = [
    {code: '1',     name: 'Profile 1'},
    {code: '2',   name: 'Profile 2'}
];

export default function getAllProfiles() {
    return JSON.parse(JSON.stringify(profiles));
}

export function getProfile(profile) {
    return Object.assign({}, profile.find((p) => p.code === profile));
}