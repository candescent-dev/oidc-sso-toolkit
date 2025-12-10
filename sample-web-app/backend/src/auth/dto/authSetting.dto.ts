import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class AuthSettingDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({
    require_protocol: true, // must have http/https
    require_tld: false, // allow localhost
  })
  initUrl: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({
    require_protocol: true, // must have http/https
    require_tld: false, // allow localhost
  })
  callbackHost: string;
}
