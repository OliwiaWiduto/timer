export const PROJECT_AVATAR_COLORS = ["#9f8053", "#745a7a", "#bf979d", "#567663", "#717e9e", "#734d42"] as const;

export function hashStringToIndex(s: string, modulo: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % modulo;
}

export function defaultAvatarColor(projectId: string) {
  return PROJECT_AVATAR_COLORS[hashStringToIndex(projectId, PROJECT_AVATAR_COLORS.length)];
}

export function defaultAvatarInitial(name: string) {
  return (name.trim()[0] ?? "P").toUpperCase();
}

type AvatarFields = {
  id: string;
  name: string;
  avatar_color: string | null;
  avatar_initial: string | null;
};

export function projectAvatarDisplay(project: AvatarFields) {
  return {
    color: project.avatar_color ?? defaultAvatarColor(project.id),
    initial: (project.avatar_initial ?? defaultAvatarInitial(project.name)).slice(0, 1).toUpperCase(),
  };
}
