--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: excel_requirements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.excel_requirements (
    id integer NOT NULL,
    requirement text NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.excel_requirements OWNER TO neondb_owner;

--
-- Name: excel_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.excel_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.excel_requirements_id_seq OWNER TO neondb_owner;

--
-- Name: excel_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.excel_requirements_id_seq OWNED BY public.excel_requirements.id;


--
-- Name: excel_requirements id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.excel_requirements ALTER COLUMN id SET DEFAULT nextval('public.excel_requirements_id_seq'::regclass);


--
-- Name: excel_requirements excel_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.excel_requirements
    ADD CONSTRAINT excel_requirements_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

