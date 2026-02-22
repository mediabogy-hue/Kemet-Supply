
export const governoratesWithCodes = [
    { name: "القاهرة", code: "EG-01" },
    { name: "الجيزة", code: "EG-02" },
    { name: "الإسكندرية", code: "EG-03" },
    { name: "الدقهلية", code: "EG-05" },
    { name: "الشرقية", code: "EG-04" },
    { name: "القليوبية", code: "EG-14" },
    { name: "البحيرة", code: "EG-15" },
    { name: "الغربية", code: "EG-06" },
    { name: "المنوفية", code: "EG-16" },
    { name: "كفر الشيخ", code: "EG-17" },
    { name: "دمياط", code: "EG-18" },
    { name: "بورسعيد", code: "EG-08" },
    { name: "الإسماعيلية", code: "EG-07" },
    { name: "السويس", code: "EG-09" },
    { name: "شمال سيناء", code: "EG-10" },
    { name: "جنوب سيناء", code: "EG-11" },
    { name: "البحر الأحمر", code: "EG-12" },
    { name: "الوادي الجديد", code: "EG-20" },
    { name: "مطروح", code: "EG-19" },
    { name: "أسيوط", code: "EG-22" },
    { name: "سوهاج", code: "EG-24" },
    { name: "قنا", code: "EG-25" },
    { name: "الأقصر", code: "EG-21" },
    { name: "أسوان", code: "EG-26" },
    { name: "بني سويف", code: "EG-27" },
    { name: "الفيوم", code: "EG-28" },
    { name: "المنيا", code: "EG-29" },
];

// Create a reverse map for easy lookup if needed
export const codeToGovernorateMap = governoratesWithCodes.reduce((acc, gov) => {
    acc[gov.code] = gov.name;
    return acc;
}, {} as Record<string, string>);
