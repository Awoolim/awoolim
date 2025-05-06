type Gender = 'male' | 'female' | 'unspecified'
type Language = 'ko' | 'en'
type HealthCondition = 'neck_disc' | 'forward_head' | 'back_pain' | 'shoulder_pain' | 'other'
type Goal = 'focus' | 'pain_relief' | 'posture' | 'other'

interface userData {
  language: Language
  name: string
  age: number
  gender: Gender
  conditions: HealthCondition[]
  otherConditionDetail?: string
  goals: Goal[]
  otherGoalDetail?: string
}
