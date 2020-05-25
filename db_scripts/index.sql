
CREATE TABLE public.channels
(
    uuid character varying(100) COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    one boolean,
    CONSTRAINT uuid_unique UNIQUE (uuid)

)
TABLESPACE pg_default;

CREATE TABLE public.users
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    username character varying(50) COLLATE pg_catalog."default",
    password character varying(256) COLLATE pg_catalog."default" NOT NULL,
    email character varying(100) COLLATE pg_catalog."default" NOT NULL,
    "firstName" character varying(50) COLLATE pg_catalog."default",
    "lastName" character varying(50) COLLATE pg_catalog."default",
    "profilePicture" character varying(100) COLLATE pg_catalog."default",
    sex character varying(20) COLLATE pg_catalog."default",
    "chatPicture" character varying(100) COLLATE pg_catalog."default",
    CONSTRAINT pk_id PRIMARY KEY (id),
    CONSTRAINT email_unique UNIQUE (email),
    CONSTRAINT username_unique UNIQUE (username)
)
TABLESPACE pg_default;

CREATE TABLE public.channel_user
(
    channel_uuid character varying(100) COLLATE pg_catalog."default" NOT NULL,
    user_id integer NOT NULL,
    CONSTRAINT channel_user_unique UNIQUE (channel_uuid, user_id),
    CONSTRAINT channel_uuid_foreign_key FOREIGN KEY (channel_uuid)
        REFERENCES public.channels (uuid) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT user_id_foreign_key FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
TABLESPACE pg_default;

CREATE INDEX fki_channel_uuid_foreign_key
    ON public.channel_user USING btree
    (channel_uuid COLLATE pg_catalog."default")
TABLESPACE pg_default;

CREATE INDEX fki_user_id_foreign_key
    ON public.channel_user USING btree
    (user_id)
TABLESPACE pg_default;

CREATE TABLE public.messages
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    body character varying(1000) COLLATE pg_catalog."default" NOT NULL,
    sender_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    channel_uuid character varying(100) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT id_primary_key PRIMARY KEY (id),
    CONSTRAINT channel_uuid_foreign_key2 FOREIGN KEY (channel_uuid)
        REFERENCES public.channels (uuid) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT sender_id_foreign_key FOREIGN KEY (sender_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
TABLESPACE pg_default;

CREATE TABLE public.message_metadatas
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    message_id integer NOT NULL,
    participant_id integer NOT NULL,
    read_at timestamp with time zone,
    CONSTRAINT id_primary_key2 PRIMARY KEY (id),
    CONSTRAINT message_id_foreign_key FOREIGN KEY (message_id)
        REFERENCES public.messages (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT participant_id_foreign_key FOREIGN KEY (participant_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE INDEX fki_message_id_foreign_key
    ON public.message_metadatas USING btree
    (message_id)
TABLESPACE pg_default;

CREATE INDEX fki_participant_id_foreign_key
    ON public.message_metadatas USING btree
    (participant_id)
TABLESPACE pg_default;

ALTER TABLE public.users
    ADD COLUMN "lastConnection" timestamp with time zone;

ALTER TABLE public.channel_user
    ADD COLUMN joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE public.message_files
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    "fileName" character varying(255) COLLATE pg_catalog."default",
    "originalFileName" character varying COLLATE pg_catalog."default",
    type character varying COLLATE pg_catalog."default",
    message_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT message_files_id PRIMARY KEY (id),
    CONSTRAINT message_files_fk FOREIGN KEY (message_id)
        REFERENCES public.messages (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
TABLESPACE pg_default;

CREATE INDEX fki_message_files_fk
    ON public.message_files USING btree
    (message_id)
TABLESPACE pg_default;



