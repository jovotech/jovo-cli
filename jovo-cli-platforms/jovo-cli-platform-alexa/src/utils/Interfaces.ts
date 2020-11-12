export interface AskSkillList {
  skills: [
    {
      skillId: string;
      stage: string | undefined;
      nameByLocale: {
        [key: string]: string;
      };
      lastUpdated: string;
    },
  ];
}
