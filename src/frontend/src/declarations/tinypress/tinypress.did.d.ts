import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Comment {
  'post_id' : bigint,
  'content' : string,
  'created_at' : bigint,
  'author_profile_id' : bigint,
  'comment_id' : bigint,
}
export interface Post {
  'title' : string,
  'post_id' : bigint,
  'body' : string,
  'creator_handle' : string,
  'created_at' : bigint,
  'author_profile_id' : bigint,
}
export interface Profile {
  'bio' : string,
  'owner' : Principal,
  'created_at' : bigint,
  'display_name' : string,
  'handle' : string,
  'profile_id' : bigint,
}
export type TinyPressError = { 'InvalidInput' : string } |
  { 'ProfileNotFound' : null } |
  { 'NotFound' : null } |
  { 'AlreadyExists' : null } |
  { 'PostNotFound' : null } |
  { 'InternalError' : string } |
  { 'Forbidden' : null };
export interface TinypressStatus {
  'status' : string,
  'comment_count' : bigint,
  'post_count' : bigint,
  'schema_version' : number,
  'profile_count' : bigint,
}
export interface _SERVICE {
  'create_comment' : ActorMethod<
    [bigint, string],
    { 'Ok' : bigint } |
      { 'Err' : TinyPressError }
  >,
  'create_post' : ActorMethod<
    [string, string],
    { 'Ok' : bigint } |
      { 'Err' : TinyPressError }
  >,
  'create_profile' : ActorMethod<
    [string, string, string],
    { 'Ok' : bigint } |
      { 'Err' : TinyPressError }
  >,
  'delete_comment' : ActorMethod<
    [bigint],
    { 'Ok' : null } |
      { 'Err' : TinyPressError }
  >,
  'delete_post' : ActorMethod<
    [bigint],
    { 'Ok' : null } |
      { 'Err' : TinyPressError }
  >,
  'delete_profile' : ActorMethod<
    [bigint],
    { 'Ok' : null } |
      { 'Err' : TinyPressError }
  >,
  'get_comments_by_author' : ActorMethod<[bigint], Array<Comment>>,
  'get_comments_by_post' : ActorMethod<
    [bigint],
    { 'Ok' : Array<Comment> } |
      { 'Err' : TinyPressError }
  >,
  'get_post' : ActorMethod<
    [bigint],
    { 'Ok' : Post } |
      { 'Err' : TinyPressError }
  >,
  'get_posts_by_author' : ActorMethod<[bigint], Array<Post>>,
  'get_profile' : ActorMethod<
    [bigint],
    { 'Ok' : Profile } |
      { 'Err' : TinyPressError }
  >,
  'tinypress_status' : ActorMethod<[], TinypressStatus>,
  'update_profile' : ActorMethod<
    [string, string],
    { 'Ok' : null } |
      { 'Err' : TinyPressError }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
