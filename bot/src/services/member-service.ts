import MemberModel, { NewMember, Member } from '../models/MemberModel';

const contains = async (
  discordUserID: string,
  guildID: string,
): Promise<boolean> => {
  const member = await MemberModel.findOne({ discordUserID, guildID });
  return member !== null;
};

const add = async (newMember: NewMember): Promise<Member> => {
  const member = new MemberModel({ ...newMember });
  const savedMember = await member.save();
  return savedMember;
};

const memberService = {
  contains,
  add,
};

export default memberService;
