export const idlFactory = ({ IDL }) => {
  const TinyPressError = IDL.Variant({
    'InvalidInput' : IDL.Text,
    'ProfileNotFound' : IDL.Null,
    'NotFound' : IDL.Null,
    'AlreadyExists' : IDL.Null,
    'PostNotFound' : IDL.Null,
    'InternalError' : IDL.Text,
    'Forbidden' : IDL.Null,
  });
  const Comment = IDL.Record({
    'post_id' : IDL.Nat64,
    'content' : IDL.Text,
    'created_at' : IDL.Nat64,
    'author_profile_id' : IDL.Nat64,
    'comment_id' : IDL.Nat64,
  });
  const Post = IDL.Record({
    'title' : IDL.Text,
    'post_id' : IDL.Nat64,
    'body' : IDL.Text,
    'creator_handle' : IDL.Text,
    'created_at' : IDL.Nat64,
    'author_profile_id' : IDL.Nat64,
  });
  const Profile = IDL.Record({
    'bio' : IDL.Text,
    'owner' : IDL.Principal,
    'created_at' : IDL.Nat64,
    'display_name' : IDL.Text,
    'handle' : IDL.Text,
    'profile_id' : IDL.Nat64,
  });
  const TinypressStatus = IDL.Record({
    'status' : IDL.Text,
    'comment_count' : IDL.Nat64,
    'post_count' : IDL.Nat64,
    'schema_version' : IDL.Nat32,
    'profile_count' : IDL.Nat64,
  });
  return IDL.Service({
    'create_comment' : IDL.Func(
        [IDL.Nat64, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : TinyPressError })],
        [],
      ),
    'create_post' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : TinyPressError })],
        [],
      ),
    'create_profile' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : TinyPressError })],
        [],
      ),
    'delete_comment' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : TinyPressError })],
        [],
      ),
    'delete_post' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : TinyPressError })],
        [],
      ),
    'delete_profile' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : TinyPressError })],
        [],
      ),
    'get_comments_by_author' : IDL.Func(
        [IDL.Nat64],
        [IDL.Vec(Comment)],
        ['query'],
      ),
    'get_comments_by_post' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : IDL.Vec(Comment), 'Err' : TinyPressError })],
        ['query'],
      ),
    'get_post' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : Post, 'Err' : TinyPressError })],
        ['query'],
      ),
    'get_posts_by_author' : IDL.Func([IDL.Nat64], [IDL.Vec(Post)], ['query']),
    'get_profile' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : Profile, 'Err' : TinyPressError })],
        ['query'],
      ),
    'tinypress_status' : IDL.Func([], [TinypressStatus], ['query']),
    'update_profile' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : TinyPressError })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
