-- Arte enviada à mão foi removida dos projetos de balls: só vale a arte oficial (PokéAPI, pelo número da dex).
-- Este script apaga o que já tinha sido enviado. Seguro para executar mais de uma vez e em qualquer ordem com o deploy
-- (a coluna "sprite" continua existindo, só fica vazia e sem uso).
update public.guild_ball_projects set sprite = null where sprite is not null;
